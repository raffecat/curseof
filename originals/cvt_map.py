#!/usr/bin/env python

import pygame
import json

def convert(filename, outfile):
    print filename
    img = pygame.image.load(filename)
    w,h = img.get_size()

    with open('halls.json','r') as f:
        data = json.load(f)
    firstTile = data[u'tilesets'][0][u'firstgid']
    firstCode = data[u'tilesets'][1][u'firstgid']

    tiles = []
    codes = []
    for y in xrange(0,h):
        for x in xrange(0,w):
            r,g,b,a = img.get_at((x,y))
            if r != 0: r += firstTile
            if b != 0: b += firstCode
            tiles.append(r)
            codes.append(b)

    data[u'width'] = w
    data[u'height'] = h
    data[u'layers'][0][u'width'] = w
    data[u'layers'][0][u'height'] = h
    data[u'layers'][0][u'data'] = tiles
    data[u'layers'][1][u'width'] = w
    data[u'layers'][1][u'height'] = h
    data[u'layers'][1][u'data'] = codes

    f = open(outfile, "wt")
    f.write(json.dumps(data, indent=2))
    f.close()


if __name__ == '__main__':
    convert("rooftops.png", "rooftops.json")
    convert("upper.png", "upper.json")
    convert("passages.png", "passages.json")
    convert("basement.png", "basement.json")
    convert("tower.bmp", "tower.json")
    convert("splash.tga", "splash.json")
