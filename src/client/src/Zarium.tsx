import React, {JSX, useImperativeHandle, useState} from "react";
import {Button} from "./UI";
import {AdminIcon, ArrowLeft, People, Settings} from "./Icons";
import {modalContainerRef} from "./App";
import {SettingsModal} from "./modals/settings";

export interface ZariumProps {
    superadmin?: boolean;
}

export interface ZariumHandle {
    show: () => void;
    hide: () => void;
    getSidebarContent: () => SidebarHandle | null;
    getMainContent: () => MainContentHandle | null;
}

export const Zarium = React.forwardRef<ZariumHandle, ZariumProps>((props, ref) => {
    const [visible, setVisible] = React.useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarContentRef = React.createRef<SidebarHandle>();
    const mainContentRef = React.createRef<MainContentHandle>();

    useImperativeHandle(ref, () => ({
        show: () => setVisible(true),
        hide: () => setVisible(false),
        getSidebarContent: () => sidebarContentRef.current,
        getMainContent: () => mainContentRef.current
    }));

    return (
        <div className={`Zarium ${visible ? 'show' : ''}`}>
            <Topbar className={sidebarOpen ? 'sidebar-open' : ''}>
                <Button
                    className={`TopbarToggle ${sidebarOpen ? 'open' : ''}`}
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    color="transparent"
                >
                    <ArrowLeft/>
                </Button>
                <Button color="secondary">
                    <People/>
                </Button>
                <Button color="secondary" onClick={() => modalContainerRef.current?.set(<SettingsModal/>)}>
                    <Settings/>
                </Button>
                {props.superadmin && (
                    <Button color="primary">
                        <AdminIcon/>
                    </Button>
                )}
            </Topbar>
            <div className="ZariumInner">
                <Sidebar className={sidebarOpen ? 'open' : ''} ref={sidebarContentRef}/>
                <MainContent
                    className={sidebarOpen ? 'overlay-active' : ''}
                    onClick={() => setSidebarOpen(false)}
                    ref={mainContentRef}
                />
            </div>
        </div>
    );
});

export interface SidebarProps {
    className?: string;
}

export interface SidebarHandle {
    setAccountbar: (accountbar: JSX.Element) => void;
    setGroups: (groups: JSX.Element) => void;
    getAccountbar: () => JSX.Element | null;
    getGroups: () => JSX.Element | null;
}

export const Sidebar = React.forwardRef<SidebarHandle, SidebarProps>((props, ref) => {
    const [accountbar,setAccountbar] = useState<JSX.Element | null>(null);
    const [groups,setGroups] = useState<JSX.Element | null>(null);

    useImperativeHandle(ref, () => ({
        setAccountbar: (newAccountbar: JSX.Element) => setAccountbar(newAccountbar),
        setGroups: (newGroups: JSX.Element) => setGroups(newGroups),
        getAccountbar: () => accountbar,
        getGroups: () => groups
    }));

    return (
        <div className={`Sidebar ${props.className ?? ''}`}>
            {groups}
            {accountbar}
        </div>
    )
});

export interface MainContentHandle {
    set: (content: JSX.Element | null) => void;
    get: () => JSX.Element | null;
}

export interface MainContentProps {
    className?: string;
    onClick?: () => void;
}

export const MainContent = React.forwardRef<MainContentHandle, MainContentProps>((props, ref) => {
    const [content, setContent] = React.useState<JSX.Element | null>(null);

    useImperativeHandle(ref, () => ({
        set: (newContent: JSX.Element | null) => setContent(newContent),
        get: () => content
    }))

    return (
        <div className={`MainContent ${props.className ?? ''}`} onClick={props.onClick}>
            { content }
        </div>
    )
});

export interface TopbarProps {
    className?: string;
}

export function Topbar(props: React.PropsWithChildren<TopbarProps>) { return <div className={`Topbar ${props.className ?? ''}`}>{props.children}</div> }

export interface AccountbarProps {
    username: string;
    displayname: string;
    id?: string;
}

export function Accountbar(props: AccountbarProps) {
    const profile = `/api/get-avatar?id=${props.id}`;

    return (
        <div className="Accountbar">
            <div className="AccountbarAvatar">
                <img src={profile} alt="Avatar" />
            </div>
            <div className="AccountbarInfo">
                <div className="AccountbarName">{props.displayname}</div>
                <div className="AccountbarStatus">@{props.username}</div>
            </div>
        </div>
    )
}

export function Groups() {
    return (
        <div className="Groups"></div>
    )
}