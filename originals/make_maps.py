#!/usr/bin/env python

import pygame

DEFS = {
    1: 'Torch',
    2: 'Rope',
    5: 'Spring',
    8: 'Crawler',
    9: 'Bat',
    12: 'Spider',
}

def convert(rooms, filename, roomId):
    img = pygame.image.load(filename)
    w,h = img.get_size()
    L,T,R,B = w,h,0,0

    for y in xrange(0,h):
        for x in xrange(0,w):
            r,g,b,a = img.get_at((x,y))
            if r != 0 or b != 0:
                if x < L: L = x # first col, initially image width.
                if x > R: R = x # last col, initially 0.
                if y < T: T = y # first row, initially image height.
                if y > B: B = y # last row, initially 0.
    if L >= R or T >= B:
        raise ValueError('map does not contain any tiles')
    map_w = R - L + 1
    map_h = B - T + 1

    rx = 0
    ry = 0
    tiles = [[0]*map_w for y in xrange(0,map_h)]
    spawns = []
    for y in xrange(0,map_h):
        for x in xrange(0,map_w):
            r,g,b,a = img.get_at((L+x,T+y))
            item = DEFS.get(b)
            if item:
                spawns.append('    %d,%d,%d' % (b, x*32+16, y*32+16)) # center of tile.
            tiles[y][x] = r

    lines = ["    " + (",".join(str(x) for x in row)) for row in tiles]
    if len(spawns):
        spawn = ",\n    %d,\n%s" % (len(spawns), ",\n".join(spawns))
    rooms.append('  "%d": [ %d, %d,\n%s%s\n  ]' % (roomId, map_w, map_h, ",\n".join(lines), spawn))


def write(rooms, outfile):
    f = open(outfile, "wt")
    f.write("{%s\n}" % ",\n".join(rooms))
    f.close()


if __name__ == '__main__':
    rooms = []
    convert(rooms, "splash.tga", 0)
    convert(rooms, "halls.bmp", 1)
    convert(rooms, "basement.bmp", 2)
    convert(rooms, "rooftops.bmp", 3)
    write(rooms, "../gen/rooms.json")
