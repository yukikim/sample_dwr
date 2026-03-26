'use client'
import React from "react";

import Link from "next/link";
import styles from '../../styles/Animation.module.css';

export default function MainHeader() {
    const [isFixed, setIsFixed] = React.useState(false);

    const updateIsFixedByScroll = (scrollThreshold: number) => {
        setIsFixed(window.scrollY >= scrollThreshold);
    };

    React.useEffect(() => {
        const scrollThreshold = 160; // スクロール位置の閾値（例: 100px）

        const handleScroll = () => {
            updateIsFixedByScroll(scrollThreshold);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);



    return (

        <header className={`flex gap-2  bg-sub-300 py-4 px-4 top-0 left-0 z-50 w-dvw text-center text-sm text-slate-100 ${isFixed ? `fixed ${styles.fadeInTarget}` : 'relative'}`}>
                <div className={`font-bold ${styles.fadeInTarget}`}>Polish-DWR</div>
                <Link
                    href="/administrators"
                    className="inline-flex h-10 items-center justify-center rounded-full bg-acc-700 px-4 text-sm font-semibold text-slate-100 transition hover:bg-acc-800"
                >
                    管理者追加
                </Link>
                <Link
                    href="/clients"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-acc-200"
                >
                    得意先管理
                </Link>
                <Link
                    href="/car-types"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-acc-200"
                >
                    車種管理
                </Link>
                <Link
                    href="/work-locations"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-acc-200"
                >
                    作業場所管理
                </Link>
                <Link
                    href="/work-contents"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-acc-200"
                >
                    作業内容管理
                </Link>
                <Link
                    href="/database-backup"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-acc-200"
                >
                    バックアップ
                </Link>
        </header>
    )
}