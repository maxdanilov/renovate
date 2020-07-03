import { getPkgReleases } from '..';
import * as httpMock from '../../../test/httpMock';
import * as versioning from '../../versioning/docker';
import jenkinsVersions from './__fixtures__/update-center.actual.json';
import { resetCache } from './get';
import * as jenkins from '.';

describe('datasource/jenkins', () => {
  describe('getReleases', () => {
    const SKIP_CACHE = process.env.RENOVATE_SKIP_CACHE;

    const params = {
      versioning: versioning.id,
      datasource: jenkins.id,
      depName: 'email-ext',
      registryUrls: ['https://updates.jenkins.io/'],
    };

    beforeEach(() => {
      resetCache();
      httpMock.setup();
      process.env.RENOVATE_SKIP_CACHE = 'true';
      jest.resetAllMocks();
    });

    afterEach(() => {
      httpMock.reset();
      process.env.RENOVATE_SKIP_CACHE = SKIP_CACHE;
    });

    it('returns null for a package miss', async () => {
      const newparams = { ...params };
      newparams.depName = 'non-existing';

      httpMock
        .scope('https://updates.jenkins.io')
        .get('/current/update-center.actual.json')
        .reply(200, jenkinsVersions);

      expect(await getPkgReleases(newparams)).toBeNull();
    });

    it('returns package releases for a hit', async () => {
      httpMock
        .scope('https://updates.jenkins.io')
        .get('/current/update-center.actual.json')
        .reply(200, jenkinsVersions);

      const res = await getPkgReleases(params);
      expect(res.releases).toHaveLength(2);
      expect(res).toMatchSnapshot();

      expect(res.sourceUrl).toBe(
        'https://github.com/jenkinsci/email-ext-plugin'
      );
      expect(res.name).toBe('email-ext');

      expect(
        res.releases.find((release) => release.version === '2.69')
      ).toBeDefined();
      expect(
        res.releases.find((release) => release.version === '2.10')
      ).toBeUndefined();
    });

    it('returns null empty response', async () => {
      httpMock
        .scope('https://updates.jenkins.io')
        .get('/current/update-center.actual.json')
        .reply(200, '{}');
      expect(await getPkgReleases(params)).toBeNull();
    });
  });
});
