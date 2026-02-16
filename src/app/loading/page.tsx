'use client'

import { AgentLoading } from "@/components/agent-loading"
import { useRouter } from "next/navigation"

export default function LoadingPage() {
    const router = useRouter()

    return (
        <AgentLoading onComplete={() => router.push('/projects')} />
    )
}
