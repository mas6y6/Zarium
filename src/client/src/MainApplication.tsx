import {animationCooldown, fetchWithCsrf} from "./utils";
import {SetupInit} from "./modals/setup";
import React from "react";
import {modalContainerRef, notificationRef, ZariumRef, setSuperadminStatus} from "./App";
import {LoadingModal} from "./UI";
import {LoginInit} from "./modals/login";
import {Accountbar, Groups} from "./Zarium";

export async function MainApplication() {
    modalContainerRef.current?.set(
        <LoadingModal />
    );

    let server_status = await (await fetchWithCsrf("/api/status")).json();
    if (!(server_status.ssl_enabled)) {
        if (window.location.protocol !== "https") {
            notificationRef.current?.add(
                {
                    title: "Warning",
                    content: "This server is not using SSL. This is not recommended for production.",
                    type: "warning"
                }
            )
        }
    }

    await animationCooldown();
    if (server_status.firstStart == true) {
        modalContainerRef.current?.set(<SetupInit />);
    } else {
        const auth = await authCheck();
        if (!auth.success) {
            modalContainerRef.current?.set(<LoginInit motd={server_status.motd} version={server_status.version}/>);
        } else {
            setSuperadminStatus(auth.superadmin || false);
            await animationCooldown();
            modalContainerRef.current?.close();
            await renderApplication();
        }
    }
}

export async function authCheck() {
    const res = await fetchWithCsrf("/api/auth/verify", {
        method: "POST"
    });

    if (!res.ok) {
        const refreshRes = await fetchWithCsrf("/api/auth/refresh", {
            method: "POST"
        });
        if (!refreshRes.ok) {
            return { success: false };
        } else {
            console.log("Refreshed session.");
            const retryRes = await fetchWithCsrf("/api/auth/verify", {
                method: "POST"
            });
            if (!retryRes.ok) return { success: false };
            const data = await retryRes.json();
            return { success: true, superadmin: data.superadmin };
        }
    }
    const data = await res.json();
    return { success: true, superadmin: data.superadmin };
}

export async function renderApplication() {
    const res = await (await fetchWithCsrf("/api/auth/get-user-data")).json();

    ZariumRef.current?.show();
    ZariumRef.current?.getSidebarContent()?.setGroups(<Groups/>);
    ZariumRef.current?.getSidebarContent()?.setAccountbar(<Accountbar id={res.id} username={res.username} displayname={res.displayname}/>);
}