import React, {JSX, useImperativeHandle, useState, useRef} from "react";
import {Button} from "./UI";
import {ArrowLeft, People, Settings, Shield} from "./Icons";
import profileImg from "../../server/assets/img/profile.png";
import {fetchWithCsrf} from "./utils";

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
            <Topbar>
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
                <Button color="secondary">
                    <Settings/>
                </Button>
                {props.superadmin && (
                    <Button color="primary">
                        <Shield/>
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

export function Topbar(props: React.PropsWithChildren) { return <div className="Topbar">{props.children}</div> }

export interface AccountbarProps {
    username: string;
    displayname: string;
    id?: string;
}

export function Accountbar(props: AccountbarProps) {
    const profile = `/api/get-avatar?id=${props.id}`;
    const [avatarUrl, setAvatarUrl] = useState(profile);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleError = () => {
        setAvatarUrl(profileImg);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const response = await fetchWithCsrf("/api/account/avatar", {
                method: "POST",
                headers: {
                    "Content-Type": file.type
                },
                body: file
            });

            if (response.ok) {
                // Refresh avatar by appending a timestamp to bypass cache
                setAvatarUrl(`${profile}&t=${new Date().getTime()}`);
            } else {
                console.error("Failed to upload avatar");
            }
        } catch (error) {
            console.error("Error uploading avatar:", error);
        }
    };

    return (
        <div className="Accountbar">
            <div className="AccountbarAvatar" onClick={handleAvatarClick} style={{cursor: 'pointer'}}>
                <img src={avatarUrl} alt="Avatar" onError={handleError} />
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{display: 'none'}}
                    accept="image/*"
                    onChange={handleFileChange}
                />
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