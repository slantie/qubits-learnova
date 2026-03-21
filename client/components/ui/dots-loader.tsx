import { cn } from '@/lib/utils';

interface DotsLoaderProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
}

const sizes = {
    sm: 'size-1.5',
    md: 'size-2',
    lg: 'size-2.5',
};

export function DotsLoader({ className, size = 'md', label }: DotsLoaderProps) {
    const dot = sizes[size];
    return (
        <div className={cn('flex flex-col items-center gap-3', className)}>
            <div className="flex items-center gap-1.5">
                <span className={cn('rounded-full bg-primary animate-bounce [animation-delay:-0.3s]', dot)} />
                <span className={cn('rounded-full bg-primary animate-bounce [animation-delay:-0.15s]', dot)} />
                <span className={cn('rounded-full bg-primary animate-bounce', dot)} />
            </div>
            {label && <p className="text-xs text-muted-foreground">{label}</p>}
        </div>
    );
}
