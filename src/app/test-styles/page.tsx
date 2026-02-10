
import { Button } from "@/components/ui/button"

export default function TestPage() {
    return (
        <div className="p-10 bg-blue-500 text-white min-h-screen">
            <h1 className="text-4xl font-bold mb-4">Tailwind Test</h1>
            <Button variant="destructive">I should be red</Button>
        </div>
    )
}
