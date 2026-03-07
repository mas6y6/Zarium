import React from "react";
import {Button, Entry, Modal} from "../UI";

interface LoginModalProp {
    title: string;
    motd: string;
    version: string;
}

export function LoginInit(props: LoginModalProp) {
    const entry = React.createRef<HTMLInputElement>();
    const button = React.createRef<HTMLButtonElement>();

    return (<Modal>
        <h1>{props.title}</h1>
        <p>{props.motd}</p>
        <p>Please enter your username to continue.</p>

        <div>
            <Entry ref={entry} placeholder="Username"/> <Button className="btn btn-primary" ref={button}>Continue</Button>
        </div>

        <p className={"subtext"}>Zarium Version: {props.version}</p>
    </Modal>)
}