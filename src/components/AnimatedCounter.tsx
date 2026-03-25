'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
    value: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value }) => {
    const [hasHydrated, setHasHydrated] = useState(false);

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    const springValue = useSpring(0, {
        stiffness: 100,
        damping: 20,
        restDelta: 0.001
    });

    useEffect(() => {
        springValue.set(value);
    }, [springValue, value]);

    const displayValue = useTransform(springValue, (current) => Math.floor(current));

    if (!hasHydrated) {
        return <span className="counter-pill">{value}</span>;
    }

    return (
        <motion.span className="counter-pill" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '999px',
            padding: '2px 10px',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginLeft: 'auto',
            minWidth: '28px',
        }}>
            {displayValue}
        </motion.span>
    );
};
