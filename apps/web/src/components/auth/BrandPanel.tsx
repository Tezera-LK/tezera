import styles from "./AuthLayout.module.css";

// The tile pattern. 6 strings x 6 letters = 36 grid cells
//g = gold, p = pink, l = light, d = dark, w = white-ish, . = empty

const ROWS = ["....gd", "...lp.", "..lppl", ".dpgg.", "lppggd", "ppplgw"];
export default function BrandPanel(){
    return(
        
        <aside className = {styles.panel}>
            <a href="/" className = {styles.logo}>
                <span className = {styles.dots} aria-hidden= "true" />
                tezera
            </a>

            <h1 className = {styles.headline}>Every event in Sri Lanka, in one place.</h1>
            <p className = {styles.sub}>Find events, plan with friends and follow live updates on the day.</p>

{/* Decorative tiles, hidden from screen readers.
          ROWS.join("")        -> one 36-letter string
          .split("")           -> an array of 36 single letters
          .map((c, i) => ...)  -> turns each letter into a <span>
             c = the letter, i = its position (0 to 35)
          key={i}  React needs a unique key on every list item.
          className: "." gets NO class (an empty cell). Any other letter
             gets two classes: styles.tile (shape) + styles[c] (colour).
             styles[c] looks up the class named after the letter, e.g. styles.g.
          `${a} ${b}` in backticks is a TEMPLATE STRING: it joins
             the two class names with a space. */}
             
            <div className = {styles.tiles} aria-hidden="true">
                {ROWS.join("").split("").map((c,i) => (
                <span key = {i} className={c === "." ? undefined : `${styles.tile} ${styles[c]}`}/>
                ))}
            </div>

        </aside>
    );
}