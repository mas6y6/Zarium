import React, {useState, useEffect} from "react";
import {Button, Entry, LoadingCircle, Modal} from "../UI";
import {fetchWithCsrf, logout} from "../utils";
import {modalContainerRef, notificationRef} from "../App";
import {ChevronLeft, ChevronRight} from "../Icons";

async function handleLogout() {
    modalContainerRef.current?.set(<Modal>
        <h1>Logout</h1>
        <p>Are you sure you want to logout?</p>
        <div>
            <Button color="danger" onClick={logout}>
                Logout
            </Button>
            <Button color="secondary" onClick={() => modalContainerRef.current?.close()}>
                Cancel
            </Button>
        </div>
    </Modal>)
}

export function SettingsModal() {
    const [visible, setVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState<string>("menu");
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));

        const loadData = async () => {
            try {
                const res = await fetchWithCsrf("/api/auth/get-user-data");
                if (res.ok) {
                    const data = await res.json();
                    setUserData(data);
                }
            } catch (e) {
                console.error("Failed to load user data", e);
            } finally {
                setLoading(false);
            }
        };

        loadData().catch((e) => {
            notificationRef.current?.add(
                {
                    title: "Error",
                    content: e,
                    type: "error"
                }
            )
        });

        if (!window.matchMedia("(max-width: 784px)").matches) {
            setCurrentPage("account");
        }
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <LoadingCircle />
                    <p>Loading settings...</p>
                </div>
            );
        }

        switch (currentPage) {
            case "account":
                return <AccountSettings userData={userData} onBack={() => setCurrentPage("menu")} />;
            case "profile":
                return <ProfileSettings userData={userData} onBack={() => setCurrentPage("menu")} />;
            case "security":
                return <SecuritySettings onBack={() => setCurrentPage("menu")} />;
            default:
                return <SettingsMenu userData={userData} onSelectPage={setCurrentPage} />;
        }
    };

    return (
        <div className={`SettingsModal ${visible ? "show" : ""}`}>
            <div className="SettingsLayout">
                <div className="SettingsSidebar">
                    <h3>Settings</h3>
                    <div className="SidebarItems">
                        <button 
                            className={`SidebarItem ${currentPage === "account" ? "active" : ""}`}
                            onClick={() => setCurrentPage("account")}
                        >
                            Account
                        </button>
                        <button 
                            className={`SidebarItem ${currentPage === "profile" ? "active" : ""}`}
                            onClick={() => setCurrentPage("profile")}
                        >
                            Profile
                        </button>
                        <button 
                            className={`SidebarItem ${currentPage === "security" ? "active" : ""}`}
                            onClick={() => setCurrentPage("security")}
                        >
                            Security
                        </button>
                    </div>
                    <div className="SidebarFooter">
                        <Button color="danger" onClick={handleLogout} style={{ width: '100%' }}>
                            Logout
                        </Button>
                        <Button color="secondary" onClick={() => modalContainerRef.current?.close()} style={{ width: '100%', marginTop: '10px' }}>
                            Close
                        </Button>
                    </div>
                </div>
                <div className="SettingsMain">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

function SettingsMenu({ userData, onSelectPage }: { userData: any, onSelectPage: (page: string) => void }) {
    return (
        <div className="MobileSettingsMenu">
            <h2>Settings</h2>
            <div className="SettingsSection">
                <p>Logged in as: <strong>{userData?.username}</strong></p>
            </div>
            <div className="MenuOptions">
                <button className="MenuOption" onClick={() => onSelectPage("account")}>
                    <span>Account Info</span>
                    <ChevronRight/>
                </button>
                <button className="MenuOption" onClick={() => onSelectPage("profile")}>
                    <span>Profile Settings</span>
                    <ChevronRight/>
                </button>
                <button className="MenuOption" onClick={() => onSelectPage("security")}>
                    <span>Security & Password</span>
                    <ChevronRight/>
                </button>
            </div>
            <div className="SettingsSection" style={{ marginTop: '20px' }}>
                <Button color="danger" onClick={handleLogout} style={{ width: '100%' }}>
                    Logout
                </Button>
                <Button color="secondary" onClick={() => modalContainerRef.current?.close()} style={{ width: '100%', marginTop: '10px' }}>
                    Close
                </Button>
            </div>
        </div>
    );
}

function AccountSettings({ userData, onBack }: { userData: any, onBack: () => void }) {
    return (
        <div className="SettingsPage">
            <div className="PageHeader">
                <Button className={"mobile-only"} onClick={onBack}><ChevronLeft/>Back</Button>
                <h2>Account Info</h2>
            </div>
            <div className="SettingsSection">
                <label>Username</label>
                <p><strong>{userData?.username}</strong></p>
            </div>
            <div className="SettingsSection">
                <label>User ID</label>
                <p><small style={{ opacity: 0.7 }}>{userData?.id}</small></p>
            </div>
        </div>
    );
}

function ProfileSettings({ userData, onBack }: { userData: any, onBack: () => void }) {
    const [displayName, setDisplayName] = useState(userData?.displayname || "");
    const [saving, setSaving] = useState(false);

    const handleUpdateDisplayName = async () => {
        setSaving(true);
        try {
            const res = await fetchWithCsrf("/api/account/display-name", {
                method: "POST",
                body: JSON.stringify({ displayName })
            });
            const data = await res.json();
            if (res.ok) {
                notificationRef.current?.add({
                    title: "Success",
                    content: "Display name updated successfully",
                    type: "success"
                });
            } else {
                notificationRef.current?.add({
                    title: "Error",
                    content: data.detail || "Failed to update display name",
                    type: "error"
                });
            }
        } catch (e) {
            notificationRef.current?.add({
                title: "Error",
                content: "An error occurred",
                type: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="SettingsPage">
            <div className="PageHeader">
                <Button className={"mobile-only"} onClick={onBack}><ChevronLeft/>Back</Button>
                <h2>Profile Settings</h2>
            </div>
            <div className="SettingsSection">
                <label>Display Name</label>
                <Entry 
                    placeholder="Display Name" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                />
                <Button onClick={handleUpdateDisplayName} disabled={saving} style={{ marginTop: '10px' }}>
                    Update Display Name
                </Button>
            </div>
        </div>
    );
}

function SecuritySettings({ onBack }: { onBack: () => void }) {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [saving, setSaving] = useState(false);

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            notificationRef.current?.add({
                title: "Error",
                content: "Please fill in both password fields",
                type: "error"
            });
            return;
        }
        setSaving(true);
        try {
            const res = await fetchWithCsrf("/api/account/password", {
                method: "POST",
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                notificationRef.current?.add({
                    title: "Success",
                    content: "Password updated successfully",
                    type: "success"
                });
                setOldPassword("");
                setNewPassword("");
            } else {
                notificationRef.current?.add({
                    title: "Error",
                    content: data.detail || "Failed to update password",
                    type: "error"
                });
            }
        } catch (e) {
            notificationRef.current?.add({
                title: "Error",
                content: "An error occurred",
                type: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="SettingsPage">
            <div className="PageHeader">
                <Button className={"mobile-only"} onClick={onBack}><ChevronLeft/>Back</Button>
                <h2>Security</h2>
            </div>
            <div className="SettingsSection">
                <label>Change Password</label>
                <Entry 
                    type="password" 
                    placeholder="Old Password" 
                    value={oldPassword} 
                    onChange={(e) => setOldPassword(e.target.value)}
                    style={{ marginBottom: '10px' }}
                />
                <Entry 
                    type="password" 
                    placeholder="New Password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button onClick={handleChangePassword} disabled={saving} style={{ marginTop: '10px' }}>
                    Update Password
                </Button>
            </div>
        </div>
    );
}
