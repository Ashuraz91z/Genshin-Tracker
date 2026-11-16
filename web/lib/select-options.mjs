import { Children, isValidElement } from 'react';
export function optionsFrom(children){
 return Children.toArray(children).flatMap(child=>!isValidElement(child)?[]:child.type==='option'?[child]:optionsFrom(child.props.children));
}
