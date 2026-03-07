import React, {useEffect, createRef} from "react";
import {
    BackgroundComponent,
    BackgroundHandle,
    Modal,
    ModalContainer,
    ModalContainerHandle,
    NotificationContainer,
    NotificationHandle
} from "./UI";
import './sass/main.scss';
import {MainApplication} from "./MainApplication";

export const notificationRef = createRef<NotificationHandle>();
export const containerRef = createRef<ModalContainerHandle>();
export const backgroundRef = createRef<BackgroundHandle>();

function App() {
    useEffect(() => {
        MainApplication().catch((e) => {
            console.error(e);
            containerRef.current?.set(
                <Modal>
                    <h1>Error</h1>
                    <p>An error occurred while loading Zarium.</p>
                    <p>Please reload to try again.</p>
                </Modal>
            );
        });
    }, []);

    return (
        <div className="App">
            <ModalContainer ref={containerRef}/>
            <NotificationContainer ref={notificationRef}/>
        </div>
    );
}

export default App;