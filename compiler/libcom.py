#
# libcom.py: created 2004/12/02 by Dima Dorfman.
#
# Copyright (C) 2004 Networks In Motion, Inc. All rights reserved.
#
# The information contained herein is confidential and proprietary to
# Networks In Motion, Inc., and is considered a trade secret as
# defined in section 499C of the California Penal Code. Use of this
# information by anyone other than authorized employees of Networks
# In Motion is granted only under a written non-disclosure agreement
# expressly prescribing the scope and manner of such use.
#

"""TPS template library compiler."""

__all__ = ['Error', 'comyt', 'comfile', 'main']
__revision__ = '$Id: //depot/tesla/main/pylib/tps/libcom.py#23 $'

import os.path, sha
import optparse
try:
    from tesla.contrib import yaml
except ImportError:
    import yaml

class Error(Exception): pass

def comyt(yt):
    def gencaps():
        caps = yt.get('capabilities', {})
        def gen():
            for k in sorted(caps):
                yield str(k)
                yield str(caps[k])
            yield ''
        yield bepack(len(caps), 4) + '\0'.join(gen())
    def gentemplates():
        for t in yt.get('templates', []):
            name, attrs = t.iteritems().next()
            attrs.sort()
            def gentpl():
                yield name
                yield '\0'
                for x in attrs:
                    yield x
                    yield '\0'
            tpl = ''.join(gentpl())
            yield bepack(len(tpl), 4)
            yield tpl
    caps = ''.join(gencaps())
    templates = ''.join(gentemplates())
    body = caps + templates
    id = sha.new(body).digest()
    return id, id + body

def comfile(fn):
    return comyt(yaml.loadFile(fn).next())

def main():
    usage = """%prog [options] [file ...]

The specified files are compiled. For each file, an output file is
created using the hexlified template library ID as the name. Errors
are reported as Python exceptions (sorry). If no files are specified,
the input is read from stdin and the binary library is written to
stdout.

"""
    parser = optparse.OptionParser(usage)
    parser.add_option('-d', type='string', dest='destdir', default='.',
                      help='destination directory')
    parser.add_option('-o', type='string', dest='outputfn',
                      help='output file name (only works for 1 argument)')
    parser.add_option('-s', action='store_true', dest='obsecure',
                      help='run obsecurity over the output file'),
    parser.add_option('-t', action='store_true', dest='terse', default=False,
                      help='Terse output')
    options, args = parser.parse_args()
    if args:
        if options.outputfn is not None:
            if len(args) > 1:
                parser.error('must have only one input file for -o')
            _, data = comfile(args[0])
            fn = os.path.join(options.destdir, options.outputfn)
            putdata(data, fn, options.obsecure)
            if options.terse:
                print options.outputfn
            else:
                print 'Built client library: %s' % options.outputfn
        else:
            for fn in args:
                id, data = comfile(fn)
                fn = os.path.join(options.destdir, id.encode('hex'))
                putdata(data, fn, options.obsecure)
                if options.terse:
                    print id.encode('hex')
                else:
                    print 'Built server library: %s' % id.encode('hex')
    else:
        import sys
        _, data = comyt(list(yaml.load(sys.stdin.read()))[0])
        sys.stdout.write(data)

def putdata(data, fn, doobsecure):
    if doobsecure:
        data = obsecure(data)
    f = open(fn, 'wbc')
    try:
        f.write(data)
    finally:
        f.close()

# Pasted from tesla.std to avoid the dependency
def bepack(v, n):
    """Pack big-endian integer into n bytes."""
    return ''.join(chr(v >> (n - i - 1) * 8 & 255) for i in xrange(n))

# Pasted from tps.io to avoid the dependency
from itertools import *
import operator
def obsecure(s):
    return ''.join(imap(chr, imap(operator.xor, imap(ord, s), repeat(0xff))))

if __name__ == '__main__':
    main()
