// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Binding, BindingTag} from './binding';

/**
 * A function that filters bindings. It returns `true` to select a given
 * binding.
 */
export type BindingFilter<ValueType = unknown> = (
  binding: Readonly<Binding<ValueType>>,
) => boolean;

/**
 * Create a binding filter for the tag pattern
 * @param tagPattern
 */
export function bindingTagFilter(tagPattern: BindingTag | RegExp) {
  let bindingFilter: BindingFilter;
  if (typeof tagPattern === 'string' || tagPattern instanceof RegExp) {
    const regexp =
      typeof tagPattern === 'string'
        ? wildcardToRegExp(tagPattern)
        : tagPattern;
    bindingFilter = b => Array.from(b.tagNames).some(t => regexp!.test(t));
  } else {
    bindingFilter = b => {
      for (const t in tagPattern) {
        // One tag name/value does not match
        if (b.tagMap[t] !== tagPattern[t]) return false;
      }
      // All tag name/value pairs match
      return true;
    };
  }
  return bindingFilter;
}

/**
 * Create a binding filter from key pattern
 * @param keyPattern Binding key, wildcard, or regexp
 */
export function bindingKeyFilter(keyPattern?: string | RegExp) {
  let filter: BindingFilter = binding => true;
  if (typeof keyPattern === 'string') {
    const regex = wildcardToRegExp(keyPattern);
    filter = binding => regex.test(binding.key);
  } else if (keyPattern instanceof RegExp) {
    filter = binding => keyPattern.test(binding.key);
  }
  return filter;
}

/**
 * Convert a wildcard pattern to RegExp
 * @param pattern A wildcard string with `*` and `?` as special characters.
 * - `*` matches zero or more characters except `.` and `:`
 * - `?` matches exactly one character except `.` and `:`
 */
function wildcardToRegExp(pattern: string): RegExp {
  // Escape reserved chars for RegExp:
  // `- \ ^ $ + . ( ) | { } [ ] :`
  let regexp = pattern.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|\:]/g, '\\$&');
  // Replace wildcard chars `*` and `?`
  // `*` matches zero or more characters except `.` and `:`
  // `?` matches one character except `.` and `:`
  regexp = regexp.replace(/\*/g, '[^.:]*').replace(/\?/g, '[^.:]');
  return new RegExp(`^${regexp}$`);
}
