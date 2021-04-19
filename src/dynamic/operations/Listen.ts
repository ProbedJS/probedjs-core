import { ReaderBase } from '../Base';
import { isDynamic } from '../Reader';

export const listen = <T>(v: ReaderBase<T>, cb: (v: T) => void): void => {
  // TODO: transform needs to be able to handle a LIST of readers, not just a single one.
  if (isDynamic(v)) {
    cb(v.current);
    v.addListener(cb);
  } else {
    return cb(v);
  }
};
