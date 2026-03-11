import {Button, LoadingModal, Modal, ModalHandle, Entry, PasswordEntry} from "../UI";
import React, {createRef, useRef} from "react";
import {modalContainerRef, notificationRef, setSuperadminStatus} from "../App";
import {animationCooldown, fetchWithCsrf, obtainVaultKey} from "../utils";
import {authCheck, renderApplication} from "../MainApplication";

export function SuperAdminSetupInit() {
    const entry = useRef<HTMLInputElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const modal = useRef<ModalHandle>(null);

    async function onClick() {
        const key = entry.current?.value.trim() || "";

        if (!key) {
            notificationRef.current?.add({
                title: "Error",
                content: "Please fill out all fields.",
                type: "error",
            });
            return;
        }

        modal.current?.hideModal();
        await animationCooldown();
        const loadingModalRef = createRef<ModalHandle>();
        modalContainerRef?.current?.set(<LoadingModal ref={loadingModalRef}/>);

        let res = (await fetchWithCsrf("/api/setup/check-superadmin-key", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                key: key
            })
        }));

        const data = await res.json();
        if (res.ok) {
            loadingModalRef.current?.hideModal();
            await animationCooldown();
            modalContainerRef?.current?.set(<SetupAdminAccountCreation superAdminKey={key}/>);
        } else {
            loadingModalRef.current?.hideModal();
            await animationCooldown();
            notificationRef.current?.add({
                title: "Error",
                content: data.detail,
                type: "error"
            });
            modalContainerRef?.current?.set(<SuperAdminSetupInit/>);
        }
    }

    return (
        <Modal ref={modal}>
            <h1>Server setup</h1>
            <p>
                This server's user database is empty (assuming this is the first
                time this server has been started)
            </p>
            <p>
                To continue with your server setup please enter your superadmin
                key located in your server log.
            </p>

            <form 
                onSubmit={(e) => { e.preventDefault(); onClick(); }}
                style={{display: "flex", gap: "10px"}}
            >
                <Entry ref={entry} placeholder="Superadmin key"/>
                <Button type="submit">Continue</Button>
            </form>
        </Modal>
    );
}

interface SetupAdminAccountCreationProps {
    superAdminKey: string
}

export function SetupAdminAccountCreation({superAdminKey}: SetupAdminAccountCreationProps) {
    const modal = useRef<ModalHandle>(null);
    const usernameEntry = useRef<HTMLInputElement>(null);
    const passwordEntry = useRef<HTMLInputElement>(null);
    const displayNameEntry = useRef<HTMLInputElement>(null);

    async function onClick() {
        let username = usernameEntry.current?.value.trim() || "";
        let password = passwordEntry.current?.value.trim() || "";
        let displayName = displayNameEntry.current?.value.trim() || "";

        if (!username) {
            notificationRef.current?.add({
                title: "Error",
                content: "Please fill out all fields.",
                type: "error",
            });
            return;
        }

        if (!password) {
            notificationRef.current?.add({
                title: "Error",
                content: "Please fill out all fields.",
                type: "error",
            });
            return;
        }

        if (!displayName) {
            notificationRef.current?.add({
                title: "Error",
                content: "Please fill out all fields.",
                type: "error",
            });
            return;
        }

        modal.current?.hideModal();
        await animationCooldown();
        const loadingModalRef = createRef<ModalHandle>();
        modalContainerRef?.current?.set(<LoadingModal ref={loadingModalRef}/>);

        let res = (await fetchWithCsrf("/api/setup/create-superadmin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password,
                displayName: displayName,
                superAdminKey: superAdminKey
            })
        }));

        if (res.ok) {
            const data = await res.json();
            const auth = await authCheck();
            if (auth.success) {
                setSuperadminStatus(auth.superadmin || false);
            }

            await obtainVaultKey(password, data);

            modalContainerRef.current?.close();
            await renderApplication();
        } else {
            const data = await res.json();
            loadingModalRef.current?.hideModal();
            await animationCooldown();
            notificationRef.current?.add({
                title: "Error",
                content: data.detail,
                type: "error"
            });
            modalContainerRef?.current?.set(<SetupAdminAccountCreation superAdminKey={superAdminKey}/>);
        }
    }

    return (
        <Modal ref={modal}>
            <h1>Server SuperAdmin creation</h1>
            <p>
                Please enter your account details to create this server's SuperAdmin account.
            </p>

            <p style={{ color: "red" }}>
                <b>Warning:</b> If you forget your password, you will permanently lose access to this account and all data on the server.
            </p>

            <form 
                onSubmit={(e) => { e.preventDefault(); onClick(); }}
                style={{display: "flex", flexDirection: "column", gap: "10px"}}
            >
                <Entry ref={usernameEntry} placeholder="Username" autoComplete={"username"}/>
                <Entry ref={displayNameEntry} placeholder="Display name"/>
                <PasswordEntry ref={passwordEntry} placeholder="Password" autoComplete={"new-password"}/>
                <Button type="submit">Create</Button>
            </form>
        </Modal>
    );
}