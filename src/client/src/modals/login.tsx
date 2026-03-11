import React, { useRef } from "react";
import { Button, Entry, LoadingModal, Modal, ModalHandle, PasswordEntry } from "../UI";
import {animationCooldown, fetchWithCsrf, obtainVaultKey} from "../utils";
import { modalContainerRef, notificationRef, setSuperadminStatus } from "../App";
import { authCheck, renderApplication } from "../MainApplication";

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
    const usernameEntry = useRef<HTMLInputElement>(null);
    const modal = useRef<ModalHandle>(null);

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

        const loadingModalRef = React.createRef<ModalHandle>();
        modalContainerRef?.current?.set(<LoadingModal ref={loadingModalRef} />);
        await animationCooldown();

        try {
            const res = await fetchWithCsrf("/api/auth/get_account_status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username })
            });

            const data = await res.json();

            if (!res.ok) {
                notificationRef.current?.add({
                    title: "Error",
                    content: data.detail || "An unknown error occurred.",
                    type: "error"
                });
                modalContainerRef?.current?.set(<LoginInit {...props} />);
                return;
            }

            if (data.setup) {
                modalContainerRef?.current?.set(<SetupInit response={{ ...data, motd: props.motd, version: props.version }} />);
            } else {
                modalContainerRef?.current?.set(
                    <LoginPassword response={{ ...data, motd: props.motd, version: props.version }} />
                );
            }
        } catch (e) {
            notificationRef.current?.add({
                title: "Error",
                content: "A connection error occurred.",
                type: "error"
            });
            modalContainerRef?.current?.set(<LoginInit {...props} />);
        }
    }

    return (
        <Modal ref={modal}>
            <h1>Login</h1>
            <p>{props.motd}</p>
            <p>Please enter your username to continue.</p>

            <form
                onSubmit={(e) => { e.preventDefault(); onContinue(); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}
            >
                <Entry ref={usernameEntry} placeholder="Username" />
                <Button type="submit">Continue</Button>
            </form>

            <p className="subtext" style={{ marginTop: '0.5rem' }}>Zarium Version: {props.version}</p>
        </Modal>
    );
}

export function LoginPassword(props: { response: AuthMethodsResponse }) {
    const modal = useRef<ModalHandle>(null);
    const passwordEntry = useRef<HTMLInputElement>(null);

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
        const loadingModalRef = React.createRef<ModalHandle>();
        modalContainerRef?.current?.set(<LoadingModal ref={loadingModalRef} />);
        await animationCooldown();

        try {
            const res = await fetchWithCsrf("/api/auth/password_auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: props.response.username,
                    password: password
                })
            });

            if (!res.ok) {
                const data = await res.json();
                notificationRef.current?.add({
                    title: "Error",
                    content: data.detail || "An unknown error occurred.",
                    type: "error"
                });
                modalContainerRef?.current?.set(<LoginPassword response={props.response} />);
                return;
            }

            const auth = await authCheck();
            if (auth.success) {
                setSuperadminStatus(auth.superadmin || false);
            }

            const data = await res.json();

            await obtainVaultKey(password,data);

            modalContainerRef?.current?.close();
            await renderApplication();
        } catch (e) {
            notificationRef.current?.add({
                title: "Error",
                content: "A connection error occurred.",
                type: "error"
            });
            modalContainerRef?.current?.set(<LoginPassword response={props.response} />);
        }
    }

    return (
        <Modal ref={modal}>
            <h1>Login</h1>
            <p>Please enter your password to continue.</p>
            <p>Account username: {props.response.username}</p>

            <form
                onSubmit={(e) => { e.preventDefault(); onSignIn(); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}
            >
                <PasswordEntry ref={passwordEntry} placeholder="Password" />
                <Button type="submit" color="primary">Sign in</Button>
                <Button
                    type="button"
                    onClick={async () => {
                        modal.current?.hideModal();
                        await animationCooldown();
                        modalContainerRef?.current?.set(<LoginInit motd={props.response.motd || ""} version={props.response.version || ""} />);
                    }}
                    color="secondary"
                >
                    Back
                </Button>
            </form>
        </Modal>
    );
}

export function SetupInit(props: { response: AuthMethodsResponse }) {
    const passwordEntry = useRef<HTMLInputElement>(null);
    const newPasswordEntry = useRef<HTMLInputElement>(null);
    const reEnterPasswordEntry = useRef<HTMLInputElement>(null);
    const modal = useRef<ModalHandle>(null);

    async function signIn() {
        const password = passwordEntry.current?.value.trim();
        const newPassword = newPasswordEntry.current?.value.trim();
        const reEnterPassword = reEnterPasswordEntry.current?.value.trim();

        // Basic validation
        if (!password || !newPassword || !reEnterPassword) {
            notificationRef.current?.add({
                title: "Error",
                content: "Please fill out all fields.",
                type: "error"
            });
            return;
        }

        if (newPassword !== reEnterPassword) {
            notificationRef.current?.add({
                title: "Error",
                content: "New password and re-entered password do not match.",
                type: "error"
            });
            return;
        }

        if (newPassword.length < 12) {
            notificationRef.current?.add({
                title: "Error",
                content: "Password must be at least 12 characters long.",
                type: "error"
            });
            return;
        }

        // Proceed with loading
        modal.current?.hideModal();
        const loadingModalRef = React.createRef<ModalHandle>();
        modalContainerRef?.current?.set(<LoadingModal ref={loadingModalRef} />);
        await animationCooldown();

        try {
            const res = await fetchWithCsrf("/api/auth/setup_account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: props.response.username,
                    password,
                    newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {
                notificationRef.current?.add({
                    title: "Error",
                    content: data.detail || "An unknown error occurred.",
                    type: "error"
                });
                modalContainerRef?.current?.set(<SetupInit response={props.response} />);
                return;
            }

            modalContainerRef?.current?.set(<Modal>
                <h1>Account Setup Complete</h1>
                <p>Your account's password has been changed.</p>
                <p>Please reload this page and sign in with your username and password.</p>
                <Button onClick={() => window.location.reload()}>Reload</Button>
            </Modal>);
        } catch (e) {
            notificationRef.current?.add({
                title: "Error",
                content: "A connection error occurred.",
                type: "error"
            });
            modalContainerRef?.current?.set(<SetupInit response={props.response} />);
        }
    }

    return (
        <Modal ref={modal}>
            <h1>Account Setup</h1>
            <p>
                This account was created by the server operator. For your privacy and security, you must change your password.
            </p>
            <p>
                To continue with setup, enter the temporary password provided by the server operator. You will then be prompted to set a new password.
            </p>
            <p>
                <b>Important:</b> If you forget your password, your account cannot be recovered. Please store it safely.
            </p>

            <form
                onSubmit={(e) => { e.preventDefault(); signIn(); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}
            >
                <PasswordEntry ref={passwordEntry} placeholder="Temporary Password" />
                <PasswordEntry ref={newPasswordEntry} placeholder="New Password" />
                <PasswordEntry ref={reEnterPasswordEntry} placeholder="Re-enter New Password" />
                <Button type="submit" color="primary">Sign in</Button>
                <Button
                    type="button"
                    onClick={async () => {
                        modal.current?.hideModal();
                        await animationCooldown();
                        modalContainerRef?.current?.set(
                            <LoginInit motd={props.response.motd || ""} version={props.response.version || ""} />
                        );
                    }}
                    color="secondary"
                >
                    Back
                </Button>
            </form>
        </Modal>
    );
}