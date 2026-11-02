import styles from "@/components/auth/AuthLayout.module.css";
import BrandPanel from "@/components/auth/BrandPanel";

export default function AuthLayout({children}: {children: React.ReactNode}){
    return (
        <div className = {styles.page}>
            <BrandPanel/>
            <main className = {styles.formSide}>
                <div className = {styles.formBox}>{children}</div>
            </main>
        </div>
    );
}