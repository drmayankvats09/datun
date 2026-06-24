/**
 * Datun cva() — dependency-free class-variance-authority equivalent (vendored).
 * Same authoring shape: cva(base, { variants, defaultVariants }). Returns a fn
 * that resolves selected variants → a class string. Swap for the npm `class-
 * variance-authority` in the app repo if its compound-variants are needed.
 */
type VariantMap = Record<string, Record<string, string>>;

interface CvaConfig<V extends VariantMap> {
  variants?: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] | boolean };
}

// The returned recipe takes an optional props bag; infer its (non-nullable)
// shape so `variant`/`size`/etc. stay statically known on VariantProps<T>.
export type VariantProps<T> = T extends (props?: infer P) => string
  ? Partial<NonNullable<P>>
  : never;

export function cva<V extends VariantMap>(base: string, config?: CvaConfig<V>) {
  return (
    props?: { [K in keyof V]?: keyof V[K] | boolean } & { class?: string; className?: string },
  ): string => {
    const classes: string[] = [base];
    const variants = config?.variants;
    if (variants) {
      for (const key of Object.keys(variants)) {
        const k = key as keyof V;
        const chosen = props?.[k] ?? config?.defaultVariants?.[k];
        if (chosen == null) continue;
        const group = variants[k] as Record<string, string>;
        const val = group[String(chosen)];
        if (val) classes.push(val);
      }
    }
    if (props?.class) classes.push(props.class);
    if (props?.className) classes.push(props.className);
    return classes.filter(Boolean).join(' ');
  };
}
