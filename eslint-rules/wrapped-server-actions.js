/**
 * In a 'use server' file every exported async function or exported const must be an `action(...)` call,
 * so each server action gets a trace span and a duration log.
 */
const rule = {
  meta: {
    type: 'problem',
    docs: { description: "Require exports of 'use server' files to be wrapped in action(name, fn)" },
    schema: [],
    messages: {
      unwrapped: "Server action '{{name}}' must be wrapped: export const {{name}} = action('<area>.{{name}}', ...).",
    },
  },
  create(context) {
    const isActionCall = (node) =>
      node &&
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'action';

    return {
      Program(program) {
        const first = program.body[0];
        const isUseServer =
          first && first.type === 'ExpressionStatement' && first.directive === 'use server';
        if (!isUseServer) return;

        for (const node of program.body) {
          if (node.type !== 'ExportNamedDeclaration' || !node.declaration) continue;
          const decl = node.declaration;
          if (decl.type === 'FunctionDeclaration') {
            context.report({ node: decl, messageId: 'unwrapped', data: { name: decl.id ? decl.id.name : 'default' } });
          } else if (decl.type === 'VariableDeclaration') {
            for (const d of decl.declarations) {
              if (!isActionCall(d.init)) {
                context.report({ node: d, messageId: 'unwrapped', data: { name: d.id.name ?? 'export' } });
              }
            }
          }
        }
      },
    };
  },
};

const plugin = { rules: { 'wrapped-server-actions': rule } };

export default plugin;
