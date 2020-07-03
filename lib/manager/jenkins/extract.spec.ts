import { readFileSync } from 'fs';
import { extractPackageFile } from './extract';

const pluginsFile = readFileSync(
  'lib/manager/jenkins/__fixtures__/plugins.txt',
  'utf8'
);

const pluginsEmptyFile = readFileSync(
  'lib/manager/jenkins/__fixtures__/empty.txt',
  'utf8'
);

describe('lib/manager/jenkins/extract', () => {
  describe('extractPackageFile()', () => {
    it('returns null for empty', () => {
      expect(extractPackageFile(pluginsEmptyFile)).toBeNull();
    });

    it('extracts multiple image lines', () => {
      const res = extractPackageFile(pluginsFile);
      expect(res.deps).toMatchSnapshot();
      expect(res.deps).toHaveLength(4);
    });
  });
});
