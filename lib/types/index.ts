// js Node
export type Position = {
  line: number; // 1 indexed
  column: number; // 0 indexed
};

export type SourceLocation = {
  start: Position;
  end: Position;
  identifierName?: string;
};

// gonzales AST Node Type
export type gASTNode = {
  traverse: Function;
  traverseByType: Function;

  type:
    | "stylesheet"
    | "ident"
    | "class"
    | "selector"
    | "value"
    | "property"
    | "ruleset"
    | "extend"
    | "declaration";
  content: string | Array<gASTNode>;
  syntax: "css" | "scss" | "less";
};
