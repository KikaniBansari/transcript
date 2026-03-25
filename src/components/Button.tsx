import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'danger' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading,
            leftIcon,
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const classNames = [
            styles.btn,
            styles[variant],
            styles[size],
            isLoading || disabled ? styles.disabled : '',
            className
        ].filter(Boolean).join(' ');

        return (
            <button
                ref={ref}
                className={classNames}
                disabled={isLoading || disabled}
                {...props}
            >
                {isLoading && (
                    <span className={styles.loader}></span>
                )}
                {!isLoading && leftIcon && (
                    <span className={styles.icon}>{leftIcon}</span>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
