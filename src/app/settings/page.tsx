"use client";

import { useAuth } from '@/providers/auth-provider';
import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [name, setName] = useState(user?.user_metadata?.name || '');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                data: { name }
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

        // In a real app, this would call an API route or Edge Function to delete the user from auth.users
        // For now, we will show a message as client-side deletion is restricted.
        alert("To effectively delete your account and all data, please contact support or an admin. (This button is a placeholder for the API integration)");
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
        router.refresh();
    };

    if (!user) {
        return <div className="min-h-screen bg-black text-white p-8">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-black text-white pt-24 px-8 pb-8 font-mono">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
                    <p className="text-white/60 text-sm">Manage your profile and preferences.</p>
                </div>

                <section className="bg-white/5 border border-white/10 p-6 rounded-lg space-y-6">
                    <h2 className="text-lg font-semibold border-b border-white/10 pb-2">Profile</h2>

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-white/40 mb-1">Email</label>
                            <input
                                type="email"
                                value={user.email}
                                disabled
                                className="w-full bg-white/5 border border-white/10 p-2 text-white/50 cursor-not-allowed rounded"
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-white/40 mb-1">Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black border border-white/20 p-2 text-white focus:border-white/60 outline-none rounded transition"
                            />
                        </div>

                        {message && (
                            <div className={`text-xs p-2 rounded ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Update Profile'}
                        </button>
                    </form>
                </section>

                <section className="bg-white/5 border border-white/10 p-6 rounded-lg space-y-4">
                    <h2 className="text-lg font-semibold border-b border-white/10 pb-2">Sign out</h2>
                    <p className="text-xs text-white/50">
                        Sign out of your account on this device.
                    </p>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 border border-white/20 text-white px-4 py-2 text-sm hover:bg-white/10 transition"
                    >
                        <LogOut className="w-4 h-4 rotate-180" />
                        Log out
                    </button>
                </section>

                <section className="bg-red-900/10 border border-red-500/20 p-6 rounded-lg space-y-4">
                    <h2 className="text-lg font-semibold text-red-400 border-b border-red-500/20 pb-2">Danger Zone</h2>
                    <p className="text-xs text-red-200/60">
                        Deleting your account will permanently remove all your projects, simulations, and personal data.
                    </p>
                    <button
                        onClick={handleDeleteAccount}
                        className="border border-red-500/40 text-red-400 px-4 py-2 text-sm hover:bg-red-500/10 transition"
                    >
                        Delete Account
                    </button>
                </section>
            </div>
        </div>
    );
}
