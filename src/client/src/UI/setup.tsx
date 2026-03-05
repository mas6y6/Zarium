import {Button, LoadingModal, Modal, ModalHandle} from "../UI";
import React, {useRef} from "react";
import {Entry} from "../UI";
import {containerRef} from "../App";
import {animationCooldown, sleep} from "../utils";

export function SetupInit() {
    const entry = useRef<HTMLInputElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const modal = useRef<ModalHandle>(null);

    async function onClick() {
        modal.current?.hideModal();
        await animationCooldown();
        containerRef?.current?.set(<LoadingModal />);
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

            <div style={{display: "flex", gap: "10px"}}>
                <Entry ref={entry} placeholder="Superadmin key"/>
                <Button ref={button} onClick={onClick}>Continue</Button>
            </div>
        </Modal>
    );
}