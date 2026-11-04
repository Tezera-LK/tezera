// ─────────────────────────────────────────────────────────────
// BUTTON: the pill-shaped buttons in the auth forms
// File: src/components/auth/Button.tsx
//
//   <Button type="submit">Log in</Button>                   solid, full width
//   <Button variant="outline">Continue with Google</Button> bordered
//   <Button block={false}>Send reset code</Button>          only as wide as its text
// Colours come from the role's CSS variables, so a primary button is
// coral, slate or sage depending on the role.
// ─────────────────────────────────────────────────────────────

import styles from "./Form.module.css";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "outline";  // UNION TYPE: only these two words allowed
  block?: boolean;                  // true = full width of the form
  size?: "medium" | "small";        // small = inside rows (Follow, Remove)
};

export default function Button({
  variant = "primary",  // DEFAULT VALUES, used when the parent doesn't pass one
  block = true,
  size = "medium",
  // A <button> inside a <form> submits it unless told otherwise, so the
  // safe default is "button". Submit buttons must say type="submit".
  type = "button",
  className,
  ...buttonProps        // REST: onClick, disabled, children (the text)...
}: ButtonProps) {
  // Build "button primary block" from the parts that apply:
  //   styles[variant] looks up styles.primary or styles.outline;
  //   block && styles.block gives the class name, or false (same for size);
  //   .filter(Boolean) drops false/undefined; .join(" ") makes one string.
  const classes = [styles.button, styles[variant], block && styles.block, size === "small" && styles.small, className]
    .filter(Boolean)
    .join(" ");

  // {...buttonProps} also passes "children", so the text ends up inside.
  return <button type={type} className={classes} {...buttonProps} />;
}
