type SplitChar = '_' | '-';
const SPLIT_CHARS: SplitChar[] = ['-', '_'];

type BeforeFirstSplit<T extends string> = T extends `${infer F}${SplitChar}${string}`
    ? F extends `${string}${SplitChar}${string}`
        ? never
        : F
    : T;
type AfterFirstSplit<T extends string> = T extends `${BeforeFirstSplit<T>}${SplitChar}${infer R}`
    ? R
    : "";

type LowerAsciiChar =
    | 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
    | 'g' | 'h' | 'i' | 'j' | 'k' | 'l'
    | 'm' | 'n' | 'o' | 'p' | 'q' | 'r'
    | 's' | 't' | 'u' | 'v' | 'w' | 'x'
    | 'y' | 'z';
type AsciiChar = Uppercase<LowerAsciiChar> | LowerAsciiChar;

type NonFirstChars<T extends string> = T extends `${AsciiChar}${infer NonFirst}` ? NonFirst : "";
type FirstChar<T extends string> = T extends `${infer First}${NonFirstChars<T>}` ? First : "";
type CapitalizeFirst<T extends string> = `${Uppercase<FirstChar<T>>}${NonFirstChars<T>}`;

export type CamelCasified<T extends string> = T extends ""
    ? T
    : `${BeforeFirstSplit<T>}${CapitalizeFirst<CamelCasified<AfterFirstSplit<T>>>}`;


export type CamelifyRegistry<Registry> = {
    [Module in keyof Registry & string as CamelCasified<Module>]: {
        [Script in keyof Registry[Module] & string as CamelCasified<Script>]: Registry[Module][Script];
    }
};
