import styles from "./Form.module.css";

type ButtonProps = React.ComponentProps<"button"> & {
  // A UNION TYPE: variant can only be one of these two words.
  variant?: "primary" | "outline";
  block?: boolean;   // true = full width of the form
};

export default function Button({
  variant = "primary",
  block = true,
  type = "button",
  className,
  ...buttonProps
}: ButtonProps) {
  // Build the class list: always .button, plus .primary or .outline,
  // plus .block if full width, plus any extra class the parent passed.
  // styles[variant] looks up styles.primary or styles.outline.
  // .filter(Boolean) drops empty values; .join(" ") makes one string.
  const classes = [styles.button, styles[variant], block && styles.block, className]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes} {...buttonProps} />;
}