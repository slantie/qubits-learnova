import Image from 'next/image';
import { DotsLoader } from './dots-loader';

interface PageLoaderProps {
    label?: string;
}

export function PageLoader({ label = 'Loading…' }: PageLoaderProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-5">
                <Image
                    src="/learnova.svg"
                    alt="Learnova"
                    width={56}
                    height={56}
                    className="size-14 object-contain"
                    priority
                />
                <DotsLoader label={label} />
            </div>
        </div>
    );
}
