import fp from "lodash/fp";
import _ from "lodash";
import path from "path";
import { Rule } from "eslint";

import {
  getStyleImportNodeData,
  getStyleClasses,
  getPropertyName,
  getClassesMap,
  getFilePath,
  getAST,
  fileExists,
} from "../core";

const rule: Rule.RuleModule = {
  meta: {
    docs: {
      description: "Checks that you are using all css/scss/less classes",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          camelCase: { enum: [true, "dashes", "only", "dashes-only"] },
          markAsUsed: { type: "array" },
        },
      },
    ],
  },
  create(context) {
    const markAsUsed: any = _.get(context, "options[0].markAsUsed");
    const camelCase = _.get(context, "options[0].camelCase");

    /*
       maps variable name to property Object
       map = {
         [variableName]: {
           classes: { foo: false, 'foo-bar': false },
           classesMap: { foo: 'foo', fooBar: 'foo-bar', 'foo-bar': 'foo-bar' },
           node: {...}
         }
       }

       example:
       import s from './foo.scss';
       s is variable name

       property Object has two keys
       1. classes: an object with className as key and a boolean as value. The boolean is marked if it is used in file
       2. classesMap: an object with propertyName as key and its className as value
       3. node: node that correspond to s (see example above)
     */
    const map = {};

    return {
      ImportDeclaration(node) {
        const styleImportNodeData = getStyleImportNodeData(node);

        if (!styleImportNodeData) {
          return;
        }

        const { importName, styleFilePath, importNode } = styleImportNodeData;

        const styleFileAbsolutePath = getFilePath(context, styleFilePath);

        let classes: Record<string, boolean> | null = {};
        let classesMap: Record<string, string> | null = {};

        if (fileExists(styleFileAbsolutePath)) {
          // this will be used to mark s.foo as used in MemberExpression
          const ast = getAST(styleFileAbsolutePath);
          classes = ast && getStyleClasses(ast);
          classesMap = classes && getClassesMap(classes, camelCase);
        }

        _.set(map, `${importName}.classes`, classes);
        _.set(map, `${importName}.classesMap`, classesMap);

        // save node for reporting unused styles
        _.set(map, `${importName}.node`, importNode);

        // save file path for reporting unused styles
        _.set(map, `${importName}.filePath`, styleFilePath);
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

        const className = _.get(
          map,
          `${objectName}.classesMap.${propertyName}`
        );

        if (className == null) {
          return;
        }

        // mark this property has used
        _.set(map, `${objectName}.classes.${className}`, true);
      },
      "Program:exit"() {
        /*
           Check if all classes defined in css/scss file are used
         */

        /*
           we are looping over each import style node in program
           example:
           ```
             import s from './foo.css';
             import x from './bar.scss';
           ```
           then the loop will be run 2 times
         */
        _.forIn(map, (o) => {
          const { classes, node, filePath } = o as any;

          /*
             if option is passed to mark a class as used, example:
             eslint css-modules/no-unused-class: [2, { markAsUsed: ['container'] }]
           */
          _.forEach(markAsUsed, (usedClass) => {
            classes[usedClass] = true;
          });

          // classNames not marked as true are unused
          const unusedClasses = fp.compose(
            fp.keys,
            fp.omitBy(fp.identity) // omit truthy values
          )(classes);

          if (!_.isEmpty(unusedClasses)) {
            context.report({
              node,
              message: `Unused classes found in ${path.basename(
                filePath
              )}: ${unusedClasses.join(", ")}`,
            });
          }
        });
      },
    };
  },
};

export default rule;
