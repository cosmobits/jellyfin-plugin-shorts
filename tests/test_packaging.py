import importlib.util
import pathlib
import unittest

path=pathlib.Path(__file__).resolve().parents[1]/'scripts/package_plugin.py'
spec=importlib.util.spec_from_file_location('package_plugin',path)
package=importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)

class CatalogTests(unittest.TestCase):
    def test_merge_preserves_older_releases_and_is_idempotent(self):
        old=[{'guid':'plugin','name':'Shorts','versions':[{'version':'0.1.0.0','targetAbi':'12.2.0.0','checksum':'old'}]}]
        new=[{'guid':'plugin','name':'Shorts','versions':[{'version':'0.2.0.0','targetAbi':'12.2.0.0','checksum':'new'}]}]
        merged=package.merge_catalog(old,new)
        self.assertEqual([v['version'] for v in merged[0]['versions']],['0.2.0.0','0.1.0.0'])
        self.assertEqual(package.merge_catalog(merged,new),merged)

    def test_keeps_separate_abi_versions(self):
        old=[{'guid':'plugin','versions':[{'version':'1.0.0.0','targetAbi':'12.2.0.0'}]}]
        new=[{'guid':'plugin','versions':[{'version':'1.0.0.0','targetAbi':'12.3.0.0'}]}]
        self.assertEqual(len(package.merge_catalog(old,new)[0]['versions']),2)

if __name__=='__main__':
    unittest.main()
