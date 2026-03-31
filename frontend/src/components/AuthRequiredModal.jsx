import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function AuthRequiredModal() {
    const navigate = useNavigate();
    const { authModal, closeAuthModal } = useApp();

    if (!authModal?.isOpen) {
        return null;
    }

    const goTo = (path) => {
        closeAuthModal();
        navigate(path);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
            <button
                type="button"
                aria-label="Close authentication modal"
                onClick={closeAuthModal}
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />

            <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#131313]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                <button
                    type="button"
                    onClick={closeAuthModal}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
                    <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                </div>

                <h2 className="text-3xl font-black font-headline tracking-tight text-white">
                    Continue Your Journey
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-300">
                    {authModal.message || 'Please log in or sign up to continue'}
                </p>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => goTo('/login')}
                        className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo('/login?mode=signup')}
                        className="rounded-full bg-amber-500 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-amber-400"
                    >
                        Sign Up
                    </button>
                </div>

                <button
                    type="button"
                    onClick={closeAuthModal}
                    className="mt-4 w-full text-sm font-semibold text-slate-400 transition-colors hover:text-white"
                >
                    Continue browsing
                </button>
            </div>
        </div>
    );
}
