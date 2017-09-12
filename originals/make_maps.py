#!/usr/bin/env python

import pygame

DEFS = {
    1: ('Torch', '', 0),
    2: ('Rope', 'DR', 4),      # 2 (top) -> 4 (bottom)
    5: ('Spring', '', 0),
    8: ('Crawler', 'LR', 16),
    9: ('Bat', 'LR', 16),
    10: ('Spider', 'D', 12),   # 10 (top) -> 12 (spider)
    48: ('Belle', '', 0),
}

def findTile(img, x, y, dx, dy, marker, name):
    ox, oy = x, y
    while True:
        x += dx
        y += dy
        r,g,b,a = img.get_at((x,y))
        if b == marker:
            dist = (x - ox) if dx != 0 else (y - oy)
            return abs(dist) * 32
        if b == 0:
            # any gap in codes indicates a missing marker.
            print "missing end-marker %d for %s at [%d,%d]" % (marker,name,ox,oy)
            return 0

def convert(rooms, filename, roomId):
    print filename
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
    spawns = [] # TODO: sort spawns by type (for render batching)
    for y in xrange(0,map_h):
        for x in xrange(0,map_w):
            r,g,b,a = img.get_at((L+x,T+y))
            tup = DEFS.get(b)
            if tup:
                name, scan, marker = tup
                xpos = x * 32 + 16 # horizontal center of tile.
                ypos = -y * 32 - 16 # vertical center of tile (relative to top-left corner of the map)
                if scan == 'DR':
                    # rope must render from the top of the top tile to the bottom of the bottom tile.
                    down = findTile(img, L+x, T+y, 0, 1, marker, name)
                    spawns.append('    %d,%d,%d,%d' % (b, xpos, ypos-down-16, ypos+16))
                elif scan == 'D':
                    # spider must move from the middle of the top tile to the middle of the bottom tile.
                    # but the strand must extend to the top of the top tile (use a bg tile?)
                    down = findTile(img, L+x, T+y, 0, 1, marker, name)
                    spawns.append('    %d,%d,%d,%d' % (b, xpos, ypos-down, ypos))
                elif scan == 'LR':
                    left = findTile(img, L+x, T+y, -1, 0, marker, name)
                    right = findTile(img, L+x, T+y, 1, 0, marker, name)
                    spawns.append('    %d,%d,%d,%d,%d' % (b, xpos, ypos, xpos-left, xpos+right))
                else:
                    spawns.append('    %d,%d,%d' % (b, xpos, ypos))
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
