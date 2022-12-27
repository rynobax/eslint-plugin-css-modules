import gonzales from "gonzales-pe";
import gonzalesPrimitive from "../../packages/gonzales-primitives";

export default {
  parse: (...args) => {
    try {
      return (gonzales as any).parse(...args);
    } catch (e) {
      try {
        return (gonzalesPrimitive as any).parse(...args);
      } catch (e) {
        return null;
      }
    }
  },
};
