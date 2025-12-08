
import * as loaderNamespace from "@assemblyscript/loader";
import loaderDefault from "@assemblyscript/loader";

console.log('Namespace Keys:', Object.keys(loaderNamespace));
console.log('Default Export:', loaderDefault);
try {
    // @ts-ignore
    console.log('Namespace.instantiate:', loaderNamespace.instantiate);
} catch (e) {
    console.log('Namespace.instantiate check failed');
}
