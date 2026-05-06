import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

function FieldActionButton({ children, onClick, disabled, tone = 'neutral', type = 'button' }) {
    const toneClass = tone === 'primary'
        ? 'bg-primary text-black hover:bg-amber-300'
        : 'bg-surface-card border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
        >
            {children}
        </button>
    );
}

export default function Settings() {
    const {
        user,
        updateProfile,
        changeEmail,
        changePassword,
        deleteAccount,
    } = useApp();

    const [isEditingName, setIsEditingName] = useState(false);
    const [displayName, setDisplayName] = useState(user?.name || '');
    const [profileError, setProfileError] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailValue, setEmailValue] = useState(user?.email || '');
    const [emailError, setEmailError] = useState('');
    const [isSavingEmail, setIsSavingEmail] = useState(false);

    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    const [deleteError, setDeleteError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const isLocalUser = user?.authProviders?.includes('local') || !user?.authProviders?.length;
    const providerName = user?.authProviders?.find((provider) => provider !== 'local');
    const providerLabel = providerName ? providerName.charAt(0).toUpperCase() + providerName.slice(1) : 'Social';

    useEffect(() => {
        if (!isEditingName) {
            setDisplayName(user?.name || '');
        }
    }, [isEditingName, user?.name]);

    useEffect(() => {
        if (!isEditingEmail) {
            setEmailValue(user?.email || '');
        }
    }, [isEditingEmail, user?.email]);

    const handleSaveName = async (event) => {
        event.preventDefault();
        const nextName = displayName.trim();

        if (!nextName) {
            setProfileError('Display name is required.');
            return;
        }

        if (nextName === user?.name) {
            setIsEditingName(false);
            return;
        }

        setIsSavingProfile(true);
        setProfileError('');

        try {
            await updateProfile({ name: nextName });
            setIsEditingName(false);
        } catch (error) {
            setProfileError(error?.response?.data?.detail || 'Unable to update display name.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleSaveEmail = async (event) => {
        event.preventDefault();
        const nextEmail = emailValue.trim().toLowerCase();

        if (!nextEmail || !nextEmail.includes('@')) {
            setEmailError('Enter a valid email address.');
            return;
        }

        if (nextEmail === user?.email) {
            setIsEditingEmail(false);
            return;
        }

        setIsSavingEmail(true);
        setEmailError('');

        try {
            await changeEmail({ email: nextEmail });
            setIsEditingEmail(false);
        } catch (error) {
            setEmailError(error?.response?.data?.detail || 'Unable to update email.');
        } finally {
            setIsSavingEmail(false);
        }
    };

    const handleSavePassword = async (event) => {
        event.preventDefault();

        if (!currentPassword) {
            setPasswordError('Current password is required.');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }

        setIsSavingPassword(true);
        setPasswordError('');

        try {
            await changePassword({ current_password: currentPassword, new_password: newPassword });
            setCurrentPassword('');
            setNewPassword('');
            setIsEditingPassword(false);
        } catch (error) {
            setPasswordError(error?.response?.data?.detail || 'Unable to update password.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteError('');

        if (!window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteAccount();
            window.location.assign('/');
        } catch (error) {
            setDeleteError(error?.response?.data?.detail || 'Unable to delete account.');
            setIsDeleting(false);
        }
    };

    const inputClass = 'w-full rounded-lg border border-slate-700 bg-surface-card px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-primary';

    return (
        <div className="w-full">
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Settings</h1>
            <p className="text-slate-400 text-sm mb-8">Manage your account details and security settings</p>

            <div className="space-y-6">
                <section className="bg-surface-dark border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">account_circle</span>
                        Account
                    </h2>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 py-3 border-b border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-white font-semibold text-sm">Display Name</p>
                                {isEditingName ? (
                                    <form onSubmit={handleSaveName} className="mt-2 flex flex-col gap-2 sm:max-w-md">
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(event) => setDisplayName(event.target.value)}
                                            className={inputClass}
                                            placeholder="Enter display name"
                                            autoFocus
                                            maxLength={80}
                                        />
                                        {profileError ? <p className="text-xs font-medium text-red-400">{profileError}</p> : null}
                                        <div className="flex items-center gap-2">
                                            <FieldActionButton type="submit" tone="primary" disabled={isSavingProfile}>
                                                {isSavingProfile ? 'Saving...' : 'Save'}
                                            </FieldActionButton>
                                            <FieldActionButton
                                                disabled={isSavingProfile}
                                                onClick={() => {
                                                    setProfileError('');
                                                    setDisplayName(user?.name || '');
                                                    setIsEditingName(false);
                                                }}
                                            >
                                                Cancel
                                            </FieldActionButton>
                                        </div>
                                    </form>
                                ) : (
                                    <p className="text-slate-400 text-xs mt-0.5">{user?.name || 'Not signed in'}</p>
                                )}
                            </div>
                            {!isEditingName ? (
                                <FieldActionButton
                                    onClick={() => {
                                        setProfileError('');
                                        setDisplayName(user?.name || '');
                                        setIsEditingName(true);
                                    }}
                                >
                                    Edit
                                </FieldActionButton>
                            ) : null}
                        </div>

                        <div className="flex flex-col gap-3 py-3 border-b border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-white font-semibold text-sm">Email</p>
                                {isLocalUser && isEditingEmail ? (
                                    <form onSubmit={handleSaveEmail} className="mt-2 flex flex-col gap-2 sm:max-w-md">
                                        <input
                                            type="email"
                                            value={emailValue}
                                            onChange={(event) => setEmailValue(event.target.value)}
                                            className={inputClass}
                                            placeholder="you@example.com"
                                            autoFocus
                                        />
                                        {emailError ? <p className="text-xs font-medium text-red-400">{emailError}</p> : null}
                                        <div className="flex items-center gap-2">
                                            <FieldActionButton type="submit" tone="primary" disabled={isSavingEmail}>
                                                {isSavingEmail ? 'Saving...' : 'Save'}
                                            </FieldActionButton>
                                            <FieldActionButton
                                                disabled={isSavingEmail}
                                                onClick={() => {
                                                    setEmailError('');
                                                    setEmailValue(user?.email || '');
                                                    setIsEditingEmail(false);
                                                }}
                                            >
                                                Cancel
                                            </FieldActionButton>
                                        </div>
                                    </form>
                                ) : (
                                    <p className="text-slate-400 text-xs mt-0.5">{user?.email || 'Not signed in'}</p>
                                )}
                            </div>
                            {isLocalUser ? (
                                !isEditingEmail ? (
                                    <FieldActionButton
                                        onClick={() => {
                                            setEmailError('');
                                            setEmailValue(user?.email || '');
                                            setIsEditingEmail(true);
                                        }}
                                    >
                                        Edit
                                    </FieldActionButton>
                                ) : null
                            ) : (
                                <span className="px-3 py-1 bg-slate-800/50 text-slate-400 text-xs font-semibold rounded border border-slate-700/50">
                                    Managed by {providerLabel}
                                </span>
                            )}
                        </div>

                        {isLocalUser ? (
                            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-semibold text-sm">Password</p>
                                    {isEditingPassword ? (
                                        <form onSubmit={handleSavePassword} className="mt-2 flex flex-col gap-3 sm:max-w-md">
                                            <div className="relative">
                                                <input
                                                    type={showPasswords ? 'text' : 'password'}
                                                    value={currentPassword}
                                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                                    className={`${inputClass} pr-14`}
                                                    placeholder="Current password"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords((value) => !value)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white"
                                                >
                                                    {showPasswords ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                            <input
                                                type={showPasswords ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(event) => setNewPassword(event.target.value)}
                                                className={inputClass}
                                                placeholder="New password, min. 6 characters"
                                            />
                                            {passwordError ? <p className="text-xs font-medium text-red-400">{passwordError}</p> : null}
                                            <div className="flex items-center gap-2">
                                                <FieldActionButton type="submit" tone="primary" disabled={isSavingPassword}>
                                                    {isSavingPassword ? 'Saving...' : 'Change'}
                                                </FieldActionButton>
                                                <FieldActionButton
                                                    disabled={isSavingPassword}
                                                    onClick={() => {
                                                        setPasswordError('');
                                                        setCurrentPassword('');
                                                        setNewPassword('');
                                                        setShowPasswords(false);
                                                        setIsEditingPassword(false);
                                                    }}
                                                >
                                                    Cancel
                                                </FieldActionButton>
                                            </div>
                                        </form>
                                    ) : (
                                        <p className="text-slate-400 text-xs mt-0.5">********</p>
                                    )}
                                </div>
                                {!isEditingPassword ? (
                                    <FieldActionButton
                                        onClick={() => {
                                            setPasswordError('');
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setShowPasswords(false);
                                            setIsEditingPassword(true);
                                        }}
                                    >
                                        Change
                                    </FieldActionButton>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </section>

                <section className="bg-surface-dark border border-red-500/30 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-red-400 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined">warning</span>
                        Danger Zone
                    </h2>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-white font-semibold text-sm">Delete Account</p>
                            <p className="text-slate-400 text-xs mt-0.5">Permanently delete your account and all data.</p>
                            {deleteError ? <p className="mt-2 text-xs font-medium text-red-400">{deleteError}</p> : null}
                        </div>
                        <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                            className="px-4 py-2 text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Account'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
