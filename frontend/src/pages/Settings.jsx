import { useApp } from '../context/AppContext';

export default function Settings() {
    const { settings, updateSettings, user } = useApp();

    const toggleSetting = (key) => {
        updateSettings({ [key]: !settings[key] });
    };

    return (
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-8">
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
                    </div>
                </section>

                {/* Playback */}
                <section className="bg-surface-dark border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">play_circle</span>
                        Playback
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <p className="text-white font-semibold text-sm">Autoplay Trailers</p>
                                <p className="text-slate-400 text-xs mt-0.5">Automatically play trailers when browsing</p>
                            </div>
                            <button
                                onClick={() => toggleSetting('autoplay')}
                                className={`w-12 h-7 rounded-full relative transition-colors ${settings.autoplay ? 'bg-primary' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${settings.autoplay ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <p className="text-white font-semibold text-sm">Video Quality</p>
                                <p className="text-slate-400 text-xs mt-0.5">Default streaming quality</p>
                            </div>
                            <select
                                value={settings.quality}
                                onChange={(e) => updateSettings({ quality: e.target.value })}
                                className="bg-bg-dark border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:border-primary outline-none"
                            >
                                <option>Auto</option>
                                <option>4K</option>
                                <option>1080p</option>
                                <option>720p</option>
                                <option>480p</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="text-white font-semibold text-sm">Language</p>
                                <p className="text-slate-400 text-xs mt-0.5">Preferred content language</p>
                            </div>
                            <select
                                value={settings.language}
                                onChange={(e) => updateSettings({ language: e.target.value })}
                                className="bg-bg-dark border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:border-primary outline-none"
                            >
                                <option>English</option>
                                <option>Hindi</option>
                                <option>Spanish</option>
                                <option>French</option>
                                <option>Japanese</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Notifications */}
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

                {/* Appearance */}
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
                        <button className="px-4 py-2 text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors">
                            Delete Account
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
