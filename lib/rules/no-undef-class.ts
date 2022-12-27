import _ from "lodash";
import { Rule } from "eslint";

import {
  getStyleImportNodeData,
  getAST,
  fileExists,
  getStyleClasses,
  getPropertyName,
  getClassesMap,
  getExportPropsMap,
  getFilePath,
} from "../core";

const rule: Rule.RuleModule = {
  meta: {
    docs: {
      description:
        "Checks that you are using the existent css/scss/less classes",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          camelCase: { enum: [true, "dashes", "only", "dashes-only"] },
        },
      },
    ],
  },
  create(context) {
    const camelCase = _.get(context, "options[0].camelCase");

    /*
       maps variable name to property Object
       map = {
         [variableName]: {
           classesMap: { foo: 'foo', fooBar: 'foo-bar', 'foo-bar': 'foo-bar' },
           node: {...}
         }
       }

       example:
       import s from './foo.scss';
       s is variable name

       property Object has two keys
       1. classesMap: an object with propertyName as key and its className as value
       2. node: node that correspond to s (see example above)
     */
    const map = {};

    return {
      ImportDeclaration(node) {
        const styleImportNodeData = getStyleImportNodeData(node);

        if (!styleImportNodeData) {
          return;
        }

        const { importName, styleFilePath, importNode } = styleImportNodeData;

        let classesMap: Record<string, string> | null = {};
        let exportPropsMap: Record<string, boolean> | null = {};

        const ast = getAST(styleFilePath, context);

        if (ast) {
          const classes = getStyleClasses(ast);
          classesMap = classes && getClassesMap(classes, camelCase);
          exportPropsMap = getExportPropsMap(ast);
        }

        // this will be used to check if classes are defined
        _.set(map, `${importName}.classesMap`, classesMap);

        // this will be used to check if :export properties are defined
        _.set(map, `${importName}.exportPropsMap`, exportPropsMap);

        // save node for reporting unused styles
        _.set(map, `${importName}.node`, importNode);
      },
      MemberExpression: (node) => {
        /*
           Check if property exists in css/scss file as class
         */

        const objectName = (node.object as any).name;

        const propertyName = getPropertyName(node);

        if (!propertyName) {
          return;
        }

        const classesMap = _.get(map, `${objectName}.classesMap`);
        const exportPropsMap = _.get(map, `${objectName}.exportPropsMap`);

        if (
          classesMap &&
          classesMap[propertyName] == null &&
          exportPropsMap &&
          exportPropsMap[propertyName] == null
        ) {
          context.report({
            node: node.property,
            message: `Class or exported property '${propertyName}' not found`,
          });
        }
      },
    };
  },
};

export default rule;
