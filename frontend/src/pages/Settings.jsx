import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Settings() {
    const { settings, updateSettings, user, logout, updateProfile, changeEmail, changePassword } = useApp();
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

    const isLocalUser = user?.authProviders?.includes('local') || !user?.authProviders?.length;
    const providerName = user?.authProviders?.find(p => p !== 'local');
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

    const handleEditName = () => {
        setProfileError('');
        setDisplayName(user?.name || '');
        setIsEditingName(true);
    };

    const handleCancelName = () => {
        setProfileError('');
        setDisplayName(user?.name || '');
        setIsEditingName(false);
    };

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

    const handleEditPassword = () => {
        setPasswordError('');
        setCurrentPassword('');
        setNewPassword('');
        setShowPasswords(false);
        setIsEditingPassword(true);
    };

    const handleCancelPassword = () => {
        setPasswordError('');
        setCurrentPassword('');
        setNewPassword('');
        setShowPasswords(false);
        setIsEditingPassword(false);
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
            setIsEditingPassword(false);
            alert("Password successfully updated.");
        } catch (error) {
            setPasswordError(error?.response?.data?.detail || 'Unable to update password.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleDeleteAccount = () => {
        if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
            // Simulate account deletion
            localStorage.clear(); // Clear all local storage data
            logout(); // Log the user out and reset state
            alert("Your account has been successfully deleted.");
            window.location.href = "/";
        }
    };

    return (
        <div className="w-full">
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Settings</h1>
            <p className="text-slate-400 text-sm mb-8">Manage your account preferences and application settings</p>

            <div className="space-y-6">
                {/* Account */}
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
                                            className="w-full rounded-lg border border-slate-700 bg-surface-card px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-primary"
                                            placeholder="Enter display name"
                                            autoFocus
                                            maxLength={80}
                                        />
                                        {profileError ? (
                                            <p className="text-xs font-medium text-red-400">{profileError}</p>
                                        ) : null}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="submit"
                                                disabled={isSavingProfile}
                                                className="px-4 py-1.5 text-xs font-bold bg-primary text-black rounded-lg transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isSavingProfile ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelName}
                                                disabled={isSavingProfile}
                                                className="px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <p className="text-slate-400 text-xs mt-0.5">{user?.name || 'Not signed in'}</p>
                                )}
                            </div>
                            {!isEditingName ? (
                                <button
                                    type="button"
                                    onClick={handleEditName}
                                    className="self-start px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors sm:self-center"
                                >
                                    Edit
                                </button>
                            ) : null}
                        </div>
                        {isLocalUser ? (
                            <>
                                <div className="flex flex-col gap-3 py-3 border-b border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-semibold text-sm">Email</p>
                                        <p className="text-slate-400 text-xs mt-0.5">{user?.email || 'Not signed in'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-semibold text-sm">Password</p>
                                        {isEditingPassword ? (
                                            <form onSubmit={handleSavePassword} className="mt-2 flex flex-col gap-3 sm:max-w-md">
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        value={currentPassword}
                                                        onChange={(event) => setCurrentPassword(event.target.value)}
                                                        className="w-full rounded-lg border border-slate-700 bg-surface-card px-3 py-2 pr-14 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-primary"
                                                        placeholder="Current password"
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords(!showPasswords)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white"
                                                    >
                                                        {showPasswords ? 'Hide' : 'Show'}
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={(event) => setNewPassword(event.target.value)}
                                                        className="w-full rounded-lg border border-slate-700 bg-surface-card px-3 py-2 pr-14 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-primary"
                                                        placeholder="New password (min. 6 characters)"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords(!showPasswords)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white"
                                                    >
                                                        {showPasswords ? 'Hide' : 'Show'}
                                                    </button>
                                                </div>
                                                {passwordError ? (
                                                    <p className="text-xs font-medium text-red-400">{passwordError}</p>
                                                ) : null}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={isSavingPassword}
                                                        className="px-4 py-1.5 text-xs font-bold bg-primary text-black rounded-lg transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isSavingPassword ? 'Saving...' : 'Change'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelPassword}
                                                        disabled={isSavingPassword}
                                                        className="px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <p className="text-slate-400 text-xs mt-0.5">••••••••</p>
                                        )}
                                    </div>
                                    {!isEditingPassword ? (
                                        <button
                                            type="button"
                                            onClick={handleEditPassword}
                                            className="self-start px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors sm:self-center"
                                        >
                                            Change
                                        </button>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-between py-3 border-b border-slate-800">
                                <div>
                                    <p className="text-white font-semibold text-sm">Email</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{user?.email || 'Not signed in'}</p>
                                </div>
                                <span className="px-3 py-1 bg-slate-800/50 text-slate-400 text-xs font-semibold rounded border border-slate-700/50">
                                    Managed by {providerLabel}
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-surface-dark border border-red-500/30 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-red-400 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined">warning</span>
                        Danger Zone
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-semibold text-sm">Delete Account</p>
                            <p className="text-slate-400 text-xs mt-0.5">Permanently delete your account and all data</p>
                        </div>
                        <button onClick={handleDeleteAccount} className="px-4 py-2 text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors">
                            Delete Account
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
