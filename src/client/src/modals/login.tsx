import React, {createRef} from "react";
import {Button, Entry, LoadingModal, Modal, ModalHandle, PasswordEntry} from "../UI";
import {animationCooldown, fetchWithCsrf} from "../utils";
import {modalContainerRef, notificationRef, setSuperadminStatus} from "../App";
import {authCheck, renderApplication} from "../MainApplication";

interface LoginModalProps {
    motd: string;
    version: string;
}

interface AuthMethodsResponse {
    username: string;
    passkey: boolean;
    totp: boolean;
    password: boolean;
    motd?: string;
    version?: string;
}

export function LoginInit(props: LoginModalProps) {
    const usernameEntry = React.createRef<HTMLInputElement>();
    const modal = React.createRef<ModalHandle>();

    async function onContinue() {
        const username = usernameEntry.current?.value.trim();
        if (!username) {
            notificationRef.current?.add({
                title: "Error",
                content: "Please fill out all fields.",
                type: "error"
            });
            return;
        }

        const loadingModalRef = createRef<ModalHandle>();
        modalContainerRef?.current?.set(<LoadingModal ref={loadingModalRef}/>);
        await animationCooldown();

        try {
            const res = await fetchWithCsrf("/api/auth/get_auth_methods", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({username})
            });

            const data = await res.json();
            if (!res.ok) {
                notificationRef.current?.add({
                    title: "Error",
                    content: data.detail || "An unknown error occurred.",
                    type: "error"
                });
                await animationCooldown();
                modalContainerRef?.current?.set(<LoginInit {...props} />);
                return;
            }

            await animationCooldown();
            modalContainerRef?.current?.set(
                <LoginMethods 
                    response={{...data, motd: props.motd, version: props.version}} 
                />
            );
        } catch (e) {
            notificationRef.current?.add({
                title: "Error",
                content: "A connection error occurred.",
                type: "error"
            });
            await animationCooldown();
            modalContainerRef?.current?.set(<LoginInit {...props} />);
        }
    }

    return (
        <Modal ref={modal}>
            <h1>Login</h1>
            <p>{props.motd}</p>
            <p>Please enter your username to continue.</p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start'}}>
                <Entry ref={usernameEntry} placeholder="Username"/>
                <Button onClick={onContinue}>Continue</Button>
            </div>

            <p className="subtext" style={{marginTop: '0.5rem'}}>Zarium Version: {props.version}</p>
        </Modal>
    );
}

export function LoginMethods(props: { response: AuthMethodsResponse }) {
    const modal = React.createRef<ModalHandle>();

    const onBack = async () => {
        modal.current?.hideModal();
        await animationCooldown();
        modalContainerRef?.current?.set(
            <LoginInit 
                motd={props.response.motd || ""} 
                version={props.response.version || ""} 
            />
        );
    };

    const onSelectPassword = async () => {
        modal.current?.hideModal();
        await animationCooldown();
        modalContainerRef?.current?.set(<LoginPassword response={props.response}/>);
    };

    return (
        <Modal ref={modal}>
            <h1>Choose a sign in method</h1>
            <p>Please select a sign in method.</p>
            <p>Account username: {props.response.username}</p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start'}}>
                {props.response.passkey && (
                    <Button onClick={async () => {}} color="primary">Passkey</Button>
                )}
                {props.response.totp && (
                    <Button onClick={async () => {}} color="primary">TOTP</Button>
                )}
                {props.response.password && (
                    <Button onClick={onSelectPassword} color="primary">Password</Button>
                )}
                <Button onClick={onBack} color="secondary">Back</Button>
            </div>
        </Modal>
    );
}

export function LoginPassword(props: { response: AuthMethodsResponse }) {
    const modal = React.createRef<ModalHandle>();
    const passwordEntry = React.createRef<HTMLInputElement>();

    async function onSignIn() {
        const password = passwordEntry.current?.value.trim();
        if (!password) {
            notificationRef.current?.add({
                title: "Error",
                content: "Please enter your password.",
                type: "error"
            });
            return;
        }

        modal.current?.hideModal();
        const loadingModalRef = createRef<ModalHandle>();
        modalContainerRef?.current?.set(<LoadingModal ref={loadingModalRef}/>);
        await animationCooldown();

        try {
            const res = await fetchWithCsrf("/api/auth/password_auth", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    username: props.response.username,
                    password
                })
            });

            if (!res.ok) {
                const data = await res.json();
                notificationRef.current?.add({
                    title: "Error",
                    content: data.detail || "An unknown error occurred.",
                    type: "error"
                });
                await animationCooldown();
                modalContainerRef?.current?.set(<LoginPassword response={props.response}/>);
                return;
            }

            const auth = await authCheck();
            if (auth.success) {
                setSuperadminStatus(auth.superadmin || false);
            }
            await animationCooldown();
            modalContainerRef.current?.close();
            await renderApplication();
        } catch (e) {
            notificationRef.current?.add({
                title: "Error",
                content: "A connection error occurred.",
                type: "error"
            });
            await animationCooldown();
            modalContainerRef?.current?.set(<LoginPassword response={props.response}/>);
        }
    }

    return (
        <Modal ref={modal}>
            <h1>Login</h1>
            <p>Please enter your password to continue.</p>
            <p>Account username: {props.response.username}</p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start'}}>
                <PasswordEntry ref={passwordEntry} placeholder="Password"/>
                <Button onClick={onSignIn} color="primary">Sign in</Button>
                <Button onClick={async () => {
                    modal.current?.hideModal();
                    await animationCooldown();
                    modalContainerRef?.current?.set(<LoginMethods response={props.response}/>);
                }} color="secondary">Back</Button>
            </div>
        </Modal>
    );
}