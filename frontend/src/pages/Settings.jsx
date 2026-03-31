import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const formatProviderName = (provider) => {
    if (provider === 'google') return 'Google';
    if (provider === 'facebook') return 'Facebook';
    if (provider === 'local') return 'Email';
    return provider ? provider[0].toUpperCase() + provider.slice(1) : 'Social';
};

export default function Settings() {
    const { settings, updateSettings, user, updateProfile, changePassword, deleteAccount } = useApp();
    const navigate = useNavigate();
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(user?.name || '');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [accountError, setAccountError] = useState('');
    const [accountMessage, setAccountMessage] = useState('');
    const [nameLoading, setNameLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        setNameDraft(user?.name || '');
    }, [user?.name]);

    const authProviders = Array.isArray(user?.authProviders) ? user.authProviders : [];
    const canChangePassword = authProviders.includes('local');
    const socialProviders = authProviders.filter((provider) => provider !== 'local');
    const socialProviderLabel = socialProviders.map(formatProviderName).join(' / ');
    const passwordStatus = canChangePassword
        ? 'Use a secure password with at least 6 characters'
        : socialProviderLabel
            ? `Managed by ${socialProviderLabel} sign-in`
            : 'Not signed in';

    const clearAccountFeedback = () => {
        setAccountError('');
        setAccountMessage('');
    };

    const toggleSetting = (key) => {
        updateSettings({ [key]: !settings[key] });
    };

    const handleSaveDisplayName = async () => {
        const nextName = nameDraft.trim();
        clearAccountFeedback();

        if (!nextName) {
            setAccountError('Display name is required');
            return;
        }

        setNameLoading(true);
        try {
            await updateProfile({ name: nextName });
            setAccountMessage('Display name updated successfully');
            setIsEditingName(false);
        } catch (err) {
            setAccountError(err?.response?.data?.detail || 'Unable to update display name right now');
        } finally {
            setNameLoading(false);
        }
    };

    const handlePasswordFieldChange = (event) => {
        const { name, value } = event.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordUpdate = async () => {
        clearAccountFeedback();

        if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
            setAccountError('Please fill in all password fields');
            return;
        }

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setAccountError('New password and confirm password must match');
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await changePassword({
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
            });
            setAccountMessage(res?.message || 'Password updated successfully');
            setShowPasswordForm(false);
            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
        } catch (err) {
            setAccountError(err?.response?.data?.detail || 'Unable to update password right now');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        clearAccountFeedback();

        const confirmed = window.confirm('Delete your account permanently? This will remove your profile, ratings, comments, and saved data.');
        if (!confirmed) {
            return;
        }

        setDeleteLoading(true);
        try {
            await deleteAccount();
            navigate('/', { replace: true });
        } catch (err) {
            setAccountError(err?.response?.data?.detail || 'Unable to delete your account right now');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-8">
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Settings</h1>
            <p className="text-slate-400 text-sm mb-8">Manage your account preferences and application settings</p>

            <div className="space-y-6">
                <section className="bg-surface-dark border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">account_circle</span>
                        Account
                    </h2>

                    {(accountError || accountMessage) && (
                        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${accountError ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
                            {accountError || accountMessage}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="py-3 border-b border-slate-800">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-white font-semibold text-sm">Display Name</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{user?.name || 'Not signed in'}</p>
                                </div>
                                {user?.id && !isEditingName && (
                                    <button
                                        onClick={() => {
                                            clearAccountFeedback();
                                            setIsEditingName(true);
                                        }}
                                        className="px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            {isEditingName && user?.id && (
                                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                    <input
                                        value={nameDraft}
                                        onChange={(event) => setNameDraft(event.target.value)}
                                        type="text"
                                        placeholder="Enter display name"
                                        className="flex-1 bg-bg-dark border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    />
                                    <button
                                        onClick={handleSaveDisplayName}
                                        disabled={nameLoading}
                                        className="px-5 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
                                    >
                                        {nameLoading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            clearAccountFeedback();
                                            setIsEditingName(false);
                                            setNameDraft(user?.name || '');
                                        }}
                                        disabled={nameLoading}
                                        className="px-5 py-3 text-sm font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-xl hover:text-white hover:border-slate-500 disabled:opacity-60 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <p className="text-white font-semibold text-sm">Email</p>
                                <p className="text-slate-400 text-xs mt-0.5">{user?.email || 'Not signed in'}</p>
                            </div>
                            <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wide bg-slate-800 text-slate-400 rounded-full">
                                Read only
                            </span>
                        </div>

                        <div className="py-3">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-white font-semibold text-sm">Password</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{passwordStatus}</p>
                                </div>
                                {canChangePassword ? (
                                    <button
                                        onClick={() => {
                                            clearAccountFeedback();
                                            setShowPasswordForm((prev) => !prev);
                                        }}
                                        className="px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors"
                                    >
                                        {showPasswordForm ? 'Close' : 'Change'}
                                    </button>
                                ) : (
                                    <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wide bg-slate-800 text-slate-400 rounded-full">
                                        Unavailable
                                    </span>
                                )}
                            </div>

                            {showPasswordForm && canChangePassword && (
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <input
                                        name="current_password"
                                        value={passwordForm.current_password}
                                        onChange={handlePasswordFieldChange}
                                        type="password"
                                        placeholder="Current password"
                                        className="bg-bg-dark border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    />
                                    <input
                                        name="new_password"
                                        value={passwordForm.new_password}
                                        onChange={handlePasswordFieldChange}
                                        type="password"
                                        placeholder="New password"
                                        className="bg-bg-dark border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    />
                                    <input
                                        name="confirm_password"
                                        value={passwordForm.confirm_password}
                                        onChange={handlePasswordFieldChange}
                                        type="password"
                                        placeholder="Confirm password"
                                        className="bg-bg-dark border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    />
                                    <div className="sm:col-span-3 flex flex-wrap gap-3">
                                        <button
                                            onClick={handlePasswordUpdate}
                                            disabled={passwordLoading}
                                            className="px-5 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
                                        >
                                            {passwordLoading ? 'Updating...' : 'Update Password'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                clearAccountFeedback();
                                                setShowPasswordForm(false);
                                                setPasswordForm({
                                                    current_password: '',
                                                    new_password: '',
                                                    confirm_password: '',
                                                });
                                            }}
                                            disabled={passwordLoading}
                                            className="px-5 py-3 text-sm font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-xl hover:text-white hover:border-slate-500 disabled:opacity-60 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="bg-surface-dark border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">notifications</span>
                        Notifications
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <p className="text-white font-semibold text-sm">Push Notifications</p>
                                <p className="text-slate-400 text-xs mt-0.5">Get notified about new releases and recommendations</p>
                            </div>
                            <button
                                onClick={() => toggleSetting('notifications')}
                                className={`w-12 h-7 rounded-full relative transition-colors ${settings.notifications ? 'bg-primary' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${settings.notifications ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="text-white font-semibold text-sm">Email Digest</p>
                                <p className="text-slate-400 text-xs mt-0.5">Weekly summary of new movies and recommendations</p>
                            </div>
                            <button
                                onClick={() => toggleSetting('emailDigest')}
                                className={`w-12 h-7 rounded-full relative transition-colors ${settings.emailDigest ? 'bg-primary' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${settings.emailDigest ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </section>

                <section className="bg-surface-dark border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">palette</span>
                        Appearance
                    </h2>
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-white font-semibold text-sm">Dark Mode</p>
                            <p className="text-slate-400 text-xs mt-0.5">Use dark theme across the application</p>
                        </div>
                        <button
                            onClick={() => toggleSetting('darkMode')}
                            className={`w-12 h-7 rounded-full relative transition-colors ${settings.darkMode ? 'bg-primary' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${settings.darkMode ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                </section>

                <section className="bg-surface-dark border border-red-500/30 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-red-400 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined">warning</span>
                        Danger Zone
                    </h2>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-white font-semibold text-sm">Delete Account</p>
                            <p className="text-slate-400 text-xs mt-0.5">Permanently delete your account and all data</p>
                        </div>
                        <button
                            onClick={handleDeleteAccount}
                            disabled={!user?.id || deleteLoading}
                            className="px-4 py-2 text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete Account'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
