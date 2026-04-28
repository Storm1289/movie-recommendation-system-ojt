import { useApp } from '../context/AppContext';

export default function Settings() {
    const { user, logout } = useApp();

    const isLocalUser = user?.authProviders?.includes('local') || !user?.authProviders?.length;
    const providerName = user?.authProviders?.find(p => p !== 'local');
    const providerLabel = providerName ? providerName.charAt(0).toUpperCase() + providerName.slice(1) : 'Social';

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
                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <p className="text-white font-semibold text-sm">Display Name</p>
                                <p className="text-slate-400 text-xs mt-0.5">{user?.name || 'Not signed in'}</p>
                            </div>
                            <button className="px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors">
                                Edit
                            </button>
                        </div>
                        {isLocalUser ? (
                            <>
                                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                                    <div>
                                        <p className="text-white font-semibold text-sm">Email</p>
                                        <p className="text-slate-400 text-xs mt-0.5">{user?.email || 'Not signed in'}</p>
                                    </div>
                                    <button className="px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors">
                                        Edit
                                    </button>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-white font-semibold text-sm">Password</p>
                                        <p className="text-slate-400 text-xs mt-0.5">••••••••</p>
                                    </div>
                                    <button className="px-4 py-1.5 text-xs font-bold bg-surface-card border border-slate-700 text-slate-300 rounded-lg hover:text-white hover:border-slate-500 transition-colors">
                                        Change
                                    </button>
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
