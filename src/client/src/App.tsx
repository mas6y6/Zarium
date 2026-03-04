import React, { useRef, useEffect } from "react";
import { Modal, ModalContainer, ModalContainerHandle, ModalHandle } from "./Modals";
import {NeutronEncryption} from "./NeutronEncryption";
import { LoadingCircle } from "./UI";
import "./css/Font.css";
import "./css/App.css";

function App() {
    const containerRef = useRef<ModalContainerHandle>(null);
    const modalRef = useRef<ModalHandle>(null);

    useEffect(() => {
        async function main() {
            containerRef.current?.set(
                <Modal ref={modalRef}>
                    <LoadingCircle />
                </Modal>
            );

            await new Promise(requestAnimationFrame);
            modalRef.current?.showModal();

            
        }

        main().catch((e) => {
            console.error(e);
            containerRef.current?.set(
                <Modal ref={modalRef}>
                    <h1>Error</h1>
                    <p>An error occurred while loading Neutron.</p>
                    <p>Please reload to try again.</p>
                </Modal>
            );
        });
    }, []);

    return (
        <div className="App">
            <ModalContainer ref={containerRef} />
        </div>
    );
}

export default App;