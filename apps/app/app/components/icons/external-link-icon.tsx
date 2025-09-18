'use client';

import { cn } from '#app/utils/misc.tsx';
import type { Variants } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

export interface ExternalLinkIconHandle {
    startAnimation: () => void;
    stopAnimation: () => void;
}

interface ExternalLinkIconProps extends HTMLAttributes<HTMLDivElement> {
    size?: number;
}

const arrowVariants: Variants = {
    animate: {
        translateX: [0, 1, 0],
        translateY: [0, -1, 0],
        transition: {
            duration: 0.4,
        },
    },
};

const ExternalLinkIcon = forwardRef<ExternalLinkIconHandle, ExternalLinkIconProps>(
    ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
        const controls = useAnimation();
        const isControlledRef = useRef(false);

        useImperativeHandle(ref, () => {
            isControlledRef.current = true;
            return {
                startAnimation: () => controls.start('animate'),
                stopAnimation: () => controls.start('normal'),
            };
        });

        const handleMouseEnter = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (!isControlledRef.current) {
                    controls.start('animate');
                } else {
                    onMouseEnter?.(e);
                }
            },
            [controls, onMouseEnter]
        );

        const handleMouseLeave = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (!isControlledRef.current) {
                    controls.start('normal');
                } else {
                    onMouseLeave?.(e);
                }
            },
            [controls, onMouseLeave]
        );

        return (
            <div
                className={cn(className)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <motion.path
                        d="M15 3h6v6"
                        variants={arrowVariants}
                        animate={controls}
                    />
                    <motion.path
                        d="M10 14 21 3"
                        variants={arrowVariants}
                        animate={controls}
                    />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
            </div>
        );
    }
);

ExternalLinkIcon.displayName = 'ExternalLinkIcon';

export { ExternalLinkIcon };