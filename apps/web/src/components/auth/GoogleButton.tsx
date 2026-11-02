import Button from "./Button";

type GoogleButtonProps = {
  onClick?: () => void;   // a function with no inputs that returns nothing
  disabled?: boolean;
};

export default function GoogleButton({ onClick, disabled }: GoogleButtonProps) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled}>
      Continue with Google
    </Button>
  );
}