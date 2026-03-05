import React, {
    forwardRef,
    InputHTMLAttributes,
    ReactNode,
    useImperativeHandle,
    useState,
    JSX,
    useRef,
    useEffect
} from "react"
import './css/UI.css'

export interface ModalContainerHandle {
    set: (modal: JSX.Element | null) => void;
    close: () => void;
}

export interface ModalHandle {
    showModal: () => void;
    hideModal: () => void;
}

export interface NotificationHandle {
    add: (notification: NotificationProps) => void;
}

export interface NotificationProps {
    id?: string;
    title?: string;
    content?: string;
    duration?: number;
    type?: 'info' | 'error' | 'success';
    borderColor?: string;
}

interface ModalProps {
    children?: ReactNode;
}

export const ModalContainer = forwardRef<ModalContainerHandle>((props, ref) => {
    const [modal, setModal] = useState<JSX.Element | null>(null);
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
        set: (newModal: JSX.Element | null) => {
            setModal(newModal);
            requestAnimationFrame(() => setVisible(true));
        },
        close: () => {
            setVisible(false);
            setTimeout(() => setModal(null), 300);
        },
    }));

    return (
        <div className={`ModalContainer ${visible ? "show" : ""}`}>
            {modal}
        </div>
    );
});

export const Modal = forwardRef<ModalHandle, ModalProps>((props, ref) => {
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
        showModal: () => {
            setVisible(true);
            requestAnimationFrame(() => setVisible(true));
        },
        hideModal: () => {
            setVisible(false);
            setTimeout(() => setVisible(false), 300);
        },
    }));

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    return (
        <div className={`Modal ${visible ? "show" : ""}`}>
            {props.children}
        </div>
    );
});

export function LoadingCircle() {
    return (
        <div className="LoadingCircle"></div>
    )
}

type EntryProps = InputHTMLAttributes<HTMLInputElement>;

export const Entry = forwardRef<HTMLInputElement, EntryProps>(
    (props, ref) => {
        return (
            <input
                className="UIEntry"
                ref={ref}
                {...props}
            />
        );
    }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (props, ref) => {
        return (
            <button
                className="UIButton"
                ref={ref}
                {...props}
            />
        );
    }
);

interface SwitchProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
}

export function Switch({ checked, onChange, disabled }: SwitchProps) {
    return (
        <label className={`UISwitch ${disabled ? 'disabled' : ''}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange?.(e.target.checked)}
                disabled={disabled}
            />
            <span className="UISwitchSlider"></span>
        </label>
    );
}

export function LoadingModal() {
    const modal = useRef<ModalHandle>(null);

    useEffect(() => {
        requestAnimationFrame(() => modal.current?.showModal());
    }, []);

    return (<Modal ref={modal}>
        <LoadingCircle />
    </Modal>);
}

export const NotificationContainer = forwardRef<NotificationHandle>((props, ref) => {
    const [notifications, setNotifications] = useState<(NotificationProps & { closing?: boolean })[]>([]);

    useImperativeHandle(ref, () => ({
        add: (notification: NotificationProps) => {
            const id = notification.id || Math.random().toString(36).substring(7);
            const duration = notification.duration || 5000;
            
            setNotifications(prev => [...prev, { ...notification, id }]);

            if (duration > 0) {
                setTimeout(() => {
                    setNotifications(prev => prev.map(n => n.id === id ? { ...n, closing: true } : n));
                    setTimeout(() => {
                        setNotifications(prev => prev.filter(n => n.id !== id));
                    }, 300);
                }, duration);
            }
        },
    }));

    return (
        <div className="NotificationContainer">
            {notifications.map(n => (
                <div 
                    key={n.id} 
                    className={`Notification ${n.type || 'info'} ${n.closing ? 'closing' : ''}`}
                    style={{ borderLeftColor: n.borderColor }}
                >
                    {n.title && <div className="NotificationTitle">{n.title}</div>}
                    {n.content && <div className="NotificationContent">{n.content}</div>}
                </div>
            ))}
        </div>
    );
});