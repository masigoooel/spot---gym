-- spot. — seed latihan bawaan + template per split
-- jalankan setelah semua migration. aman dijalankan ulang: latihan di-upsert per slug, template bawaan diganti.
-- kind: 'beban' (beban × rep), 'durasi' (detik, mis. plank), 'kardio' (menit + jarak opsional)
-- muscle: dada | punggung | bahu | bisep | trisep | lengan bawah | paha depan | paha belakang | bokong | betis | perut | full body | kardio | mobilitas | lain
-- referensi daftar gerakan: wger.de / exercemus (CC-BY-SA 3.0) dan panduan latihan umum; nama & alias disusun ulang sendiri.
-- equipment: barbel | dumbel | mesin | kabel | smith | ez-bar | trap bar | landmine | kettlebell | berat badan | sled | alat lain
-- aturan alias: parser memakai alias TERPANJANG yang cocok (mis. "leg press" menang atas "press").

insert into exercises (slug, name, aliases, muscle, equipment, alternatives, is_bodyweight, kind) values

-- ===== dada =====
('bench-press',          'bench press',            array['bench','bp','flat bench','bench barbel'], 'dada', 'barbel',      array['db-press','smith-bench-press','chest-press-machine'], false, 'beban'),
('incline-bench-press',  'incline bench press',    array['incline bench','ibp','incline bb'],       'dada', 'barbel',      array['incline-db-press','smith-incline-press'],            false, 'beban'),
('decline-bench-press',  'decline bench press',    array['decline bench','decline bb'],             'dada', 'barbel',      array['decline-db-press','dips'],                           false, 'beban'),
('db-press',             'db press',               array['dumbbell press','db bench','dbp'],        'dada', 'dumbel',      array['bench-press','chest-press-machine'],                 false, 'beban'),
('incline-db-press',     'incline db press',       array['incline db','idb','incline dumbbell'],    'dada', 'dumbel',      array['incline-bench-press','incline-chest-press'],         false, 'beban'),
('decline-db-press',     'decline db press',       array['decline db'],                             'dada', 'dumbel',      array['decline-bench-press'],                               false, 'beban'),
('smith-bench-press',    'smith bench press',      array['smith bench','smith flat'],               'dada', 'smith',       array['bench-press','db-press'],                            false, 'beban'),
('smith-incline-press',  'smith incline press',    array['smith incline'],                          'dada', 'smith',       array['incline-bench-press','incline-db-press'],            false, 'beban'),
('chest-press-machine',  'chest press',            array['chest press','cp','mesin dada'],          'dada', 'mesin',       array['db-press','bench-press'],                            false, 'beban'),
('incline-chest-press',  'incline chest press',    array['incline machine','incline mesin'],        'dada', 'mesin',       array['incline-db-press'],                                  false, 'beban'),
('pec-deck',             'pec deck',               array['pecdeck','butterfly','chest fly mesin'],  'dada', 'mesin',       array['cable-fly','db-fly'],                                false, 'beban'),
('cable-fly',            'cable fly',              array['fly','cable crossover','crossover'],      'dada', 'kabel',       array['pec-deck','db-fly'],                                 false, 'beban'),
('low-cable-fly',        'low to high cable fly',  array['low fly','low cable fly'],                'dada', 'kabel',       array['incline-db-fly'],                                    false, 'beban'),
('high-cable-fly',       'high to low cable fly',  array['high fly','high cable fly'],              'dada', 'kabel',       array['cable-fly'],                                         false, 'beban'),
('db-fly',               'db fly',                 array['dumbbell fly','flye','db flye'],          'dada', 'dumbel',      array['cable-fly','pec-deck'],                              false, 'beban'),
('incline-db-fly',       'incline db fly',         array['incline fly'],                            'dada', 'dumbel',      array['low-cable-fly'],                                     false, 'beban'),
('dips',                 'dips',                   array['dip','chest dips'],                       'dada', 'berat badan', array['assisted-dips','decline-bench-press'],               true,  'beban'),
('assisted-dips',        'assisted dips',          array['dips mesin','dip assist'],                'dada', 'mesin',       array['dips'],                                              false, 'beban'),
('push-up',              'push-up',                array['pushup','push up'],                       'dada', 'berat badan', array['db-press'],                                          true,  'beban'),
('db-pullover',          'db pullover',            array['pullover'],                               'dada', 'dumbel',      array['straight-arm-pulldown'],                             false, 'beban'),

-- ===== punggung =====
('deadlift',             'deadlift',               array['dl','conventional deadlift'],             'punggung', 'barbel',      array['trap-bar-deadlift','rack-pull'],              false, 'beban'),
('sumo-deadlift',        'sumo deadlift',          array['sumo','sumo dl'],                         'punggung', 'barbel',      array['deadlift','trap-bar-deadlift'],               false, 'beban'),
('trap-bar-deadlift',    'trap bar deadlift',      array['hex bar','tbdl','trap bar'],              'punggung', 'trap bar',    array['deadlift'],                                   false, 'beban'),
('rack-pull',            'rack pull',              array['rack pulls'],                             'punggung', 'barbel',      array['deadlift'],                                   false, 'beban'),
('pull-up',              'pull-up',                array['pullup','pull up'],                       'punggung', 'berat badan', array['assisted-pull-up','lat-pulldown'],            true,  'beban'),
('chin-up',              'chin-up',                array['chinup','chin up'],                       'punggung', 'berat badan', array['assisted-pull-up','lat-pulldown'],            true,  'beban'),
('assisted-pull-up',     'assisted pull-up',       array['assisted pullup','pull up mesin'],        'punggung', 'mesin',       array['lat-pulldown'],                               false, 'beban'),
('lat-pulldown',         'lat pulldown',           array['pulldown','lpd','lat pull','wide grip pulldown'],              'punggung', 'kabel',       array['pull-up','machine-pulldown'],                 false, 'beban'),
('close-grip-pulldown',  'close-grip pulldown',    array['close grip pulldown','v bar pulldown','cgp'], 'punggung', 'kabel',   array['lat-pulldown'],                               false, 'beban'),
('single-arm-pulldown',  'single arm pulldown',    array['one arm pulldown'],                       'punggung', 'kabel',       array['lat-pulldown'],                               false, 'beban'),
('machine-pulldown',     'pulldown mesin',         array['pulldown mesin','machine pulldown'],      'punggung', 'mesin',       array['lat-pulldown'],                               false, 'beban'),
('barbell-row',          'barbell row',            array['row','bbrow','bent over row','bor'],      'punggung', 'barbel',      array['db-row','seated-cable-row'],                  false, 'beban'),
('pendlay-row',          'pendlay row',            array['pendlay'],                                'punggung', 'barbel',      array['barbell-row'],                                false, 'beban'),
('t-bar-row',            't-bar row',              array['tbar','t bar','tbar row'],                'punggung', 'landmine',    array['chest-supported-row','barbell-row'],          false, 'beban'),
('db-row',               'db row',                 array['dumbbell row','one arm row','single arm row'], 'punggung', 'dumbel', array['seated-cable-row','machine-row'],             false, 'beban'),
('chest-supported-row',  'chest supported row',    array['csr','seal row','incline row'],           'punggung', 'dumbel',      array['machine-row','t-bar-row'],                    false, 'beban'),
('seated-cable-row',     'seated cable row',       array['cable row','scr','seated row'],           'punggung', 'kabel',       array['machine-row','barbell-row'],                  false, 'beban'),
('wide-grip-seated-row', 'seated wide grip row',   array['wide grip row','seated wide row','wide row','wgr'], 'punggung', 'kabel', array['seated-cable-row','machine-row'],          false, 'beban'),
('single-arm-cable-row', 'single arm cable row',   array['one arm cable row'],                      'punggung', 'kabel',       array['db-row'],                                     false, 'beban'),
('reverse-grip-pulldown','reverse grip pulldown',  array['underhand pulldown','supinated pulldown'],'punggung', 'kabel',       array['chin-up','lat-pulldown'],                     false, 'beban'),
('high-row-machine',     'high row mesin',         array['high row'],                               'punggung', 'mesin',       array['lat-pulldown'],                               false, 'beban'),
('machine-row',          'machine row',            array['row mesin','hammer row'],                 'punggung', 'mesin',       array['seated-cable-row'],                           false, 'beban'),
('straight-arm-pulldown','straight arm pulldown',  array['sapd','straight arm'],                    'punggung', 'kabel',       array['db-pullover'],                                false, 'beban'),
('meadows-row',          'meadows row',            array['meadows'],                                'punggung', 'landmine',    array['db-row'],                                     false, 'beban'),
('inverted-row',         'inverted row',           array['australian pull up','body row'],          'punggung', 'berat badan', array['seated-cable-row'],                           true,  'beban'),
('back-extension',       'back extension',         array['hyperextension','hyper','back ext'],      'punggung', 'berat badan', array['good-morning'],                               true,  'beban'),
('shrug',                'barbell shrug',          array['shrugs','bb shrug'],                      'punggung', 'barbel',      array['db-shrug'],                                   false, 'beban'),
('db-shrug',             'db shrug',               array['dumbbell shrug'],                         'punggung', 'dumbel',      array['shrug'],                                      false, 'beban'),

-- ===== bahu =====
('overhead-press',       'overhead press',         array['ohp','press','military press'],          'bahu', 'barbel',   array['db-shoulder-press','machine-shoulder-press'],  false, 'beban'),
('db-shoulder-press',    'db shoulder press',      array['dbsp','db ohp','shoulder press db'],      'bahu', 'dumbel',   array['machine-shoulder-press','overhead-press'],     false, 'beban'),
('arnold-press',         'arnold press',           array['arnold'],                                 'bahu', 'dumbel',   array['db-shoulder-press'],                           false, 'beban'),
('machine-shoulder-press','shoulder press mesin',  array['shoulder press','sp mesin'],              'bahu', 'mesin',    array['db-shoulder-press'],                           false, 'beban'),
('smith-shoulder-press', 'smith shoulder press',   array['smith ohp'],                              'bahu', 'smith',    array['overhead-press'],                              false, 'beban'),
('landmine-press',       'landmine press',         array['landmine'],                               'bahu', 'landmine', array['db-shoulder-press'],                           false, 'beban'),
('push-press',           'push press',             array['pp'],                                     'bahu', 'barbel',   array['overhead-press'],                              false, 'beban'),
('lateral-raise',        'lateral raise',          array['lat raise','lr','side raise'],            'bahu', 'dumbel',   array['cable-lateral-raise','machine-lateral-raise'], false, 'beban'),
('cable-lateral-raise',  'cable lateral raise',    array['cable lateral','clr'],                    'bahu', 'kabel',    array['lateral-raise'],                               false, 'beban'),
('machine-lateral-raise','lateral raise mesin',    array['lateral mesin'],                          'bahu', 'mesin',    array['lateral-raise'],                               false, 'beban'),
('cable-y-raise',        'cable y raise',          array['y raise'],                                'bahu', 'kabel',    array['lateral-raise'],                               false, 'beban'),
('front-raise',          'front raise',            array['fr'],                                     'bahu', 'dumbel',   array['cable-front-raise'],                           false, 'beban'),
('cable-front-raise',    'cable front raise',      array['cable front'],                            'bahu', 'kabel',    array['front-raise'],                                 false, 'beban'),
('rear-delt-fly',        'rear delt fly',          array['rdf','reverse fly','rear fly'],           'bahu', 'dumbel',   array['reverse-pec-deck','face-pull'],                false, 'beban'),
('reverse-pec-deck',     'reverse pec deck',       array['reverse fly mesin','rear delt mesin'],    'bahu', 'mesin',    array['rear-delt-fly'],                               false, 'beban'),
('face-pull',            'face pull',              array['fp','facepull'],                          'bahu', 'kabel',    array['rear-delt-fly'],                               false, 'beban'),
('upright-row',          'upright row',            array['ur'],                                     'bahu', 'barbel',   array['lateral-raise'],                               false, 'beban'),

-- ===== bisep =====
('barbell-curl',         'barbell curl',           array['curl','bbc','bb curl'],                   'bisep', 'barbel', array['ez-bar-curl','db-curl'],          false, 'beban'),
('ez-bar-curl',          'ez bar curl',            array['ez curl','ezc'],                          'bisep', 'ez-bar', array['barbell-curl'],                    false, 'beban'),
('db-curl',              'db curl',                array['dumbbell curl','dbc','bicep curl'],       'bisep', 'dumbel', array['barbell-curl','cable-curl'],       false, 'beban'),
('alternating-db-curl',  'alternating db curl',    array['alt curl','alternate curl'],              'bisep', 'dumbel', array['db-curl'],                         false, 'beban'),
('hammer-curl',          'hammer curl',            array['hammer','hc'],                            'bisep', 'dumbel', array['rope-hammer-curl'],                false, 'beban'),
('rope-hammer-curl',     'rope hammer curl',       array['cable hammer'],                           'bisep', 'kabel',  array['hammer-curl'],                     false, 'beban'),
('preacher-curl',        'preacher curl',          array['preacher'],                               'bisep', 'ez-bar', array['machine-preacher-curl'],           false, 'beban'),
('machine-preacher-curl','preacher curl mesin',    array['bicep mesin','preacher mesin'],           'bisep', 'mesin',  array['preacher-curl'],                   false, 'beban'),
('incline-db-curl',      'incline db curl',        array['incline curl'],                           'bisep', 'dumbel', array['bayesian-curl'],                   false, 'beban'),
('cable-curl',           'cable curl',             array['cc'],                                     'bisep', 'kabel',  array['barbell-curl'],                    false, 'beban'),
('bayesian-curl',        'bayesian curl',          array['bayesian'],                               'bisep', 'kabel',  array['incline-db-curl'],                 false, 'beban'),
('concentration-curl',   'concentration curl',     array['conc curl'],                              'bisep', 'dumbel', array['preacher-curl'],                   false, 'beban'),
('spider-curl',          'spider curl',            array['spider'],                                 'bisep', 'dumbel', array['preacher-curl'],                   false, 'beban'),

-- ===== trisep =====
('tricep-pushdown',      'tricep pushdown',        array['pushdown','tpd','bar pushdown'],          'trisep', 'kabel',       array['rope-pushdown'],                     false, 'beban'),
('rope-pushdown',        'rope pushdown',          array['rope','rope tpd'],                        'trisep', 'kabel',       array['tricep-pushdown'],                   false, 'beban'),
('overhead-tricep-extension','overhead tricep extension', array['ote','overhead extension','french press'], 'trisep', 'kabel', array['db-overhead-extension'],          false, 'beban'),
('db-overhead-extension','db overhead extension',  array['db french press','db overhead'],          'trisep', 'dumbel',      array['overhead-tricep-extension'],         false, 'beban'),
('skull-crusher',        'skull crusher',          array['skullcrusher','lying extension','sc'],    'trisep', 'ez-bar',      array['overhead-tricep-extension'],         false, 'beban'),
('close-grip-bench-press','close-grip bench press',array['cgbp','close grip bench'],                'trisep', 'barbel',      array['skull-crusher','jm-press'],          false, 'beban'),
('jm-press',             'jm press',               array['jm'],                                     'trisep', 'barbel',      array['close-grip-bench-press'],            false, 'beban'),
('tricep-dips',          'bench dips',             array['bench dips','tricep dips'],               'trisep', 'berat badan', array['close-grip-bench-press'],            true,  'beban'),
('diamond-push-up',      'diamond push-up',        array['diamond pushup','diamond'],               'trisep', 'berat badan', array['close-grip-bench-press'],            true,  'beban'),
('db-kickback',          'tricep kickback',        array['kickback','tricep kickback'],             'trisep', 'dumbel',      array['cable-tricep-kickback'],             false, 'beban'),
('cable-tricep-kickback','cable tricep kickback',  array['cable kickback tricep'],                  'trisep', 'kabel',       array['db-kickback'],                       false, 'beban'),
('machine-tricep-extension','tricep extension mesin', array['tricep mesin'],                        'trisep', 'mesin',       array['tricep-pushdown'],                   false, 'beban'),

-- ===== lengan bawah =====
('wrist-curl',           'wrist curl',             array['wrist'],                                  'lengan bawah', 'dumbel',      array['reverse-curl'],  false, 'beban'),
('reverse-curl',         'reverse curl',           array['reverse ez curl'],                        'lengan bawah', 'ez-bar',      array['wrist-curl'],    false, 'beban'),
('farmer-walk',          'farmer walk',            array['farmers walk','farmers carry','fw'],      'lengan bawah', 'dumbel',      array['dead-hang'],     false, 'beban'),
('dead-hang',            'dead hang',              array['hang','gantung'],                         'lengan bawah', 'berat badan', array['farmer-walk'],   true,  'durasi'),

-- ===== paha depan =====
('squat',                'squat',                  array['sq','back squat','bs'],                   'paha depan', 'barbel',      array['hack-squat','leg-press','smith-squat'], false, 'beban'),
('front-squat',          'front squat',            array['fs'],                                     'paha depan', 'barbel',      array['goblet-squat','hack-squat'],            false, 'beban'),
('smith-squat',          'smith squat',            array['squat smith'],                            'paha depan', 'smith',       array['squat'],                                false, 'beban'),
('hack-squat',           'hack squat',             array['hack'],                                   'paha depan', 'mesin',       array['leg-press','pendulum-squat'],           false, 'beban'),
('pendulum-squat',       'pendulum squat',         array['pendulum'],                               'paha depan', 'mesin',       array['hack-squat'],                           false, 'beban'),
('belt-squat',           'belt squat',             array['belt'],                                   'paha depan', 'mesin',       array['leg-press'],                            false, 'beban'),
('leg-press',            'leg press',              array['lp'],                                     'paha depan', 'mesin',       array['hack-squat','squat'],                   false, 'beban'),
('goblet-squat',         'goblet squat',           array['goblet','gs'],                            'paha depan', 'dumbel',      array['front-squat'],                          false, 'beban'),
('bulgarian-split-squat','bulgarian split squat',  array['bss','bulgarian','split squat'],          'paha depan', 'dumbel',      array['lunge','step-up'],                      false, 'beban'),
('lunge',                'lunge',                  array['lunges','walking lunge'],                 'paha depan', 'dumbel',      array['bulgarian-split-squat'],                false, 'beban'),
('reverse-lunge',        'reverse lunge',          array['back lunge'],                             'paha depan', 'dumbel',      array['lunge'],                                false, 'beban'),
('step-up',              'step up',                array['stepup','step-up'],                       'paha depan', 'dumbel',      array['lunge'],                                false, 'beban'),
('leg-extension',        'leg extension',          array['le','legex','leg ext'],                   'paha depan', 'mesin',       array['sissy-squat'],                          false, 'beban'),
('sissy-squat',          'sissy squat',            array['sissy'],                                  'paha depan', 'berat badan', array['leg-extension'],                        true,  'beban'),
('bodyweight-squat',     'squat berat badan',      array['air squat','bodyweight squat'],                   'paha depan', 'berat badan', array['goblet-squat'],                         true,  'beban'),
('hip-adduction',        'hip adduction',          array['adduction','adductor','paha dalam'],      'paha depan', 'mesin',       array[]::text[],                               false, 'beban'),
('wall-sit',             'wall sit',               array['wallsit'],                                'paha depan', 'berat badan', array['bodyweight-squat'],                     true,  'durasi'),

-- ===== paha belakang =====
('romanian-deadlift',    'romanian deadlift',      array['rdl'],                                    'paha belakang', 'barbel',      array['db-rdl','lying-leg-curl'],      false, 'beban'),
('db-rdl',               'db romanian deadlift',   array['db rdl'],                                 'paha belakang', 'dumbel',      array['romanian-deadlift'],            false, 'beban'),
('stiff-leg-deadlift',   'stiff-leg deadlift',     array['sldl','stiff leg'],                       'paha belakang', 'barbel',      array['romanian-deadlift'],            false, 'beban'),
('single-leg-rdl',       'single leg rdl',         array['sl rdl','single leg deadlift'],           'paha belakang', 'dumbel',      array['db-rdl'],                       false, 'beban'),
('lying-leg-curl',       'lying leg curl',         array['leg curl','lc','lying curl'],             'paha belakang', 'mesin',       array['seated-leg-curl','nordic-curl'],false, 'beban'),
('seated-leg-curl',      'seated leg curl',        array['seated curl','slc'],                      'paha belakang', 'mesin',       array['lying-leg-curl'],               false, 'beban'),
('nordic-curl',          'nordic curl',            array['nordic','nordics'],                       'paha belakang', 'berat badan', array['lying-leg-curl'],               true,  'beban'),
('good-morning',         'good morning',           array['gm'],                                     'paha belakang', 'barbel',      array['romanian-deadlift'],            false, 'beban'),

-- ===== bokong =====
('hip-thrust',           'hip thrust',             array['ht','hipthrust'],                         'bokong', 'barbel', array['machine-hip-thrust','glute-bridge'], false, 'beban'),
('machine-hip-thrust',   'hip thrust mesin',       array['glute drive','hip thrust machine'],       'bokong', 'mesin',  array['hip-thrust'],                        false, 'beban'),
('glute-bridge',         'glute bridge',           array['bridge'],                                 'bokong', 'barbel', array['hip-thrust'],                        false, 'beban'),
('cable-glute-kickback', 'cable glute kickback',   array['glute kickback','kickback glute'],        'bokong', 'kabel',  array['glute-kickback-machine'],            false, 'beban'),
('glute-kickback-machine','glute kickback mesin',  array['kickback mesin'],                         'bokong', 'mesin',  array['cable-glute-kickback'],              false, 'beban'),
('hip-abduction',        'hip abduction',          array['abduction','abductor'],                   'bokong', 'mesin',  array['cable-hip-abduction'],               false, 'beban'),
('cable-hip-abduction',  'cable hip abduction',    array['cable abduction'],                        'bokong', 'kabel',  array['hip-abduction'],                     false, 'beban'),
('cable-pull-through',   'cable pull through',     array['pull through'],                           'bokong', 'kabel',  array['hip-thrust'],                        false, 'beban'),

-- ===== betis =====
('standing-calf-raise',  'standing calf raise',    array['calf raise','calf','standing calf'],      'betis', 'mesin', array['seated-calf-raise','leg-press-calf-raise'], false, 'beban'),
('seated-calf-raise',    'seated calf raise',      array['seated calf'],                            'betis', 'mesin', array['standing-calf-raise'],                      false, 'beban'),
('leg-press-calf-raise', 'calf press',             array['calf press','calf leg press'],            'betis', 'mesin', array['standing-calf-raise'],                      false, 'beban'),
('smith-calf-raise',     'smith calf raise',       array['calf smith'],                             'betis', 'smith', array['standing-calf-raise'],                      false, 'beban'),

-- ===== perut =====
('plank',                'plank',                  array['planking'],                               'perut', 'berat badan', array['dead-bug'],               true,  'durasi'),
('side-plank',           'side plank',             array['plank samping'],                          'perut', 'berat badan', array['plank'],                  true,  'durasi'),
('crunch',               'crunch',                 array['crunches'],                               'perut', 'berat badan', array['cable-crunch'],           true,  'beban'),
('cable-crunch',         'cable crunch',           array['kneeling crunch'],                        'perut', 'kabel',       array['crunch','machine-crunch'],false, 'beban'),
('machine-crunch',       'crunch mesin',           array['ab machine','ab crunch mesin'],           'perut', 'mesin',       array['cable-crunch'],           false, 'beban'),
('sit-up',               'sit-up',                 array['situp','sit up'],                         'perut', 'berat badan', array['crunch'],                 true,  'beban'),
('decline-sit-up',       'decline sit-up',         array['decline situp','decline sit up'],         'perut', 'berat badan', array['sit-up'],                 true,  'beban'),
('hanging-leg-raise',    'hanging leg raise',      array['hlr','leg raise gantung'],                'perut', 'berat badan', array['captains-chair'],         true,  'beban'),
('captains-chair',       'captain''s chair knee raise', array['knee raise','captain chair'],        'perut', 'mesin',       array['hanging-leg-raise'],      true,  'beban'),
('lying-leg-raise',      'lying leg raise',        array['leg raise'],                              'perut', 'berat badan', array['hanging-leg-raise'],      true,  'beban'),
('ab-wheel',             'ab wheel',               array['ab roller','rollout'],                    'perut', 'alat lain',   array['plank'],                  true,  'beban'),
('russian-twist',        'russian twist',          array['twist'],                                  'perut', 'berat badan', array['cable-woodchopper'],      true,  'beban'),
('cable-woodchopper',    'cable woodchopper',      array['woodchopper','wood chop'],                'perut', 'kabel',       array['russian-twist'],          false, 'beban'),
('dead-bug',             'dead bug',               array['deadbug'],                                'perut', 'berat badan', array['plank'],                  true,  'beban'),
('pallof-press',         'pallof press',           array['pallof'],                                 'perut', 'kabel',       array['side-plank'],             false, 'beban'),

-- ===== full body =====
('kettlebell-swing',     'kettlebell swing',       array['kb swing','swing'],                       'full body', 'kettlebell',  array['hip-thrust'],      false, 'beban'),
('power-clean',          'power clean',            array['clean'],                                  'full body', 'barbel',      array['kettlebell-swing'],false, 'beban'),
('thruster',             'thruster',               array['thrusters'],                              'full body', 'barbel',      array['push-press'],      false, 'beban'),
('turkish-get-up',       'turkish get-up',         array['tgu','get up'],                           'full body', 'kettlebell',  array[]::text[],          false, 'beban'),
('burpee',               'burpee',                 array['burpees'],                                'full body', 'berat badan', array[]::text[],          true,  'beban'),
('sled-push',            'sled push',              array['sled','prowler'],                         'full body', 'sled',        array[]::text[],          false, 'beban'),
('med-ball-slam',        'med ball slam',          array['ball slam','slam'],                       'full body', 'alat lain',   array[]::text[],          false, 'beban'),

-- ===== kardio =====
('treadmill',            'treadmill',              array['tm','lari treadmill'],                    'kardio', 'mesin',       array['outdoor-run','incline-walk'], false, 'kardio'),
('incline-walk',         'incline walk',           array['jalan nanjak','12-3-30'],                 'kardio', 'mesin',       array['treadmill','stairmaster'],   false, 'kardio'),
('outdoor-run',          'lari',                   array['lari','jogging','run','lari pagi'],       'kardio', 'berat badan', array['treadmill'],                 true,  'kardio'),
('stationary-bike',      'sepeda statis',          array['bike','sepeda','spinning'],               'kardio', 'mesin',       array['elliptical','assault-bike'], false, 'kardio'),
('assault-bike',         'assault bike',           array['air bike'],                               'kardio', 'mesin',       array['stationary-bike'],           false, 'kardio'),
('elliptical',           'elliptical',             array['elips','cross trainer'],                  'kardio', 'mesin',       array['stationary-bike'],           false, 'kardio'),
('rowing-machine',       'rowing machine',         array['rower','rowing','dayung'],                'kardio', 'mesin',       array['elliptical'],                false, 'kardio'),
('stairmaster',          'stairmaster',            array['stair','stair climber','tangga'],         'kardio', 'mesin',       array['incline-walk'],              false, 'kardio'),
('jump-rope',            'lompat tali',            array['skipping','skiping','jump rope'],         'kardio', 'alat lain',   array[]::text[],                    false, 'kardio'),
('battle-rope',          'battle rope',            array['battle ropes'],                           'kardio', 'alat lain',   array[]::text[],                    false, 'kardio'),
('swimming',             'renang',                 array['renang','swim'],                          'kardio', 'alat lain',   array[]::text[],                    true,  'kardio'),

-- ===== lain =====
('lain',                 'latihan lain',           array['lain','lainnya'],                         'lain', 'alat lain', array[]::text[], false, 'beban')

on conflict (slug) do update set
  name = excluded.name, aliases = excluded.aliases, muscle = excluded.muscle, equipment = excluded.equipment,
  alternatives = excluded.alternatives, is_bodyweight = excluded.is_bodyweight, kind = excluded.kind;


-- ===== tambahan 27 okt: variasi & gerakan lain =====
insert into exercises (slug, name, aliases, muscle, equipment, alternatives, is_bodyweight, kind) values

-- dada
('floor-press',            'floor press',              array['bb floor press'],                       'dada', 'barbel',      array['bench-press'],                 false, 'beban'),
('db-floor-press',         'db floor press',           array['dumbbell floor press'],                 'dada', 'dumbel',      array['db-press'],                    false, 'beban'),
('cable-chest-press',      'cable chest press',        array['single arm cable press','cable press'], 'dada', 'kabel',       array['chest-press-machine'],         false, 'beban'),
('svend-press',            'svend press',              array['plate press','plate squeeze'],          'dada', 'alat lain',   array['cable-fly'],                   false, 'beban'),
('smith-decline-press',    'smith decline press',      array['smith decline'],                        'dada', 'smith',       array['decline-bench-press'],         false, 'beban'),
('decline-chest-press',    'decline chest press',      array['decline press mesin','decline machine'],'dada', 'mesin',       array['decline-bench-press'],         false, 'beban'),
('incline-push-up',        'incline push-up',          array['incline pushup'],                       'dada', 'berat badan', array['push-up'],                     true,  'beban'),
('decline-push-up',        'decline push-up',          array['decline pushup','feet elevated push up'],'dada','berat badan', array['push-up'],                     true,  'beban'),

-- punggung
('kroc-row',               'kroc row',                 array['kroc'],                                 'punggung', 'dumbel',      array['db-row'],                  false, 'beban'),
('low-row-machine',        'low row mesin',            array['low row','seated row mesin'],           'punggung', 'mesin',       array['seated-cable-row'],        false, 'beban'),
('cable-pullover',         'cable pullover',           array['rope pullover','cable pull over'],      'punggung', 'kabel',       array['straight-arm-pulldown'],   false, 'beban'),
('neutral-grip-pull-up',   'neutral grip pull-up',     array['neutral pullup','hammer pullup'],       'punggung', 'berat badan', array['pull-up','close-grip-pulldown'], true, 'beban'),
('muscle-up',              'muscle-up',                array['muscleup','muscle up'],                 'punggung', 'berat badan', array['pull-up'],                 true,  'beban'),
('snatch-grip-deadlift',   'snatch grip deadlift',     array['snatch grip dl'],                       'punggung', 'barbel',      array['deadlift'],                false, 'beban'),
('deficit-deadlift',       'deficit deadlift',         array['deficit dl'],                           'punggung', 'barbel',      array['deadlift'],                false, 'beban'),
('yates-row',              'yates row',                array['underhand row','reverse grip row'],     'punggung', 'barbel',      array['barbell-row'],             false, 'beban'),
('renegade-row',           'renegade row',             array['renegade'],                             'punggung', 'dumbel',      array['db-row'],                  false, 'beban'),
('reverse-hyperextension', 'reverse hyperextension',   array['reverse hyper'],                        'punggung', 'mesin',       array['back-extension'],          false, 'beban'),
('cable-shrug',            'cable shrug',              array['shrug kabel'],                          'punggung', 'kabel',       array['shrug'],                   false, 'beban'),
('smith-shrug',            'smith shrug',              array['shrug smith'],                          'punggung', 'smith',       array['shrug'],                   false, 'beban'),

-- bahu
('leaning-lateral-raise',  'leaning lateral raise',    array['lean away lateral','egyptian lateral'], 'bahu', 'dumbel',      array['cable-lateral-raise'],         false, 'beban'),
('cable-upright-row',      'cable upright row',        array['upright row kabel'],                    'bahu', 'kabel',       array['upright-row'],                 false, 'beban'),
('behind-neck-press',      'behind the neck press',    array['btn press','behind neck press'],        'bahu', 'barbel',      array['overhead-press'],              false, 'beban'),
('z-press',                'z press',                  array['zpress'],                               'bahu', 'barbel',      array['overhead-press'],              false, 'beban'),
('plate-front-raise',      'plate front raise',        array['front raise plate'],                    'bahu', 'alat lain',   array['front-raise'],                 false, 'beban'),
('band-pull-apart',        'band pull apart',          array['pull apart'],                           'bahu', 'alat lain',   array['face-pull'],                   false, 'beban'),
('cable-rear-delt-fly',    'cable rear delt fly',      array['cable reverse fly','rear delt kabel'],  'bahu', 'kabel',       array['reverse-pec-deck'],            false, 'beban'),
('single-arm-db-press',    'single arm db press',      array['one arm shoulder press'],               'bahu', 'dumbel',      array['db-shoulder-press'],           false, 'beban'),
('lu-raise',               'lu raise',                 array['lu raises'],                            'bahu', 'dumbel',      array['lateral-raise'],               false, 'beban'),
('kettlebell-press',       'kettlebell press',         array['kb press'],                             'bahu', 'kettlebell',  array['single-arm-db-press'],         false, 'beban'),

-- bisep
('drag-curl',              'drag curl',                array['drag'],                                 'bisep', 'barbel', array['barbell-curl'],      false, 'beban'),
('zottman-curl',           'zottman curl',             array['zottman'],                              'bisep', 'dumbel', array['hammer-curl'],       false, 'beban'),
('cable-preacher-curl',    'cable preacher curl',      array['preacher kabel'],                       'bisep', 'kabel',  array['preacher-curl'],     false, 'beban'),
('bicep-21s',              'bicep 21s',                array['21s','twenty ones'],                    'bisep', 'barbel', array['barbell-curl'],      false, 'beban'),
('cross-body-hammer-curl', 'cross body hammer curl',   array['cross body curl'],                      'bisep', 'dumbel', array['hammer-curl'],       false, 'beban'),
('high-cable-curl',        'high cable curl',          array['double bicep cable','overhead cable curl'], 'bisep', 'kabel', array['cable-curl'],     false, 'beban'),
('incline-hammer-curl',    'incline hammer curl',      array['incline hammer'],                       'bisep', 'dumbel', array['hammer-curl'],       false, 'beban'),

-- trisep
('single-arm-pushdown',    'single arm pushdown',      array['one arm pushdown'],                     'trisep', 'kabel',  array['tricep-pushdown'],             false, 'beban'),
('reverse-grip-pushdown',  'reverse grip pushdown',    array['underhand pushdown'],                   'trisep', 'kabel',  array['tricep-pushdown'],             false, 'beban'),
('db-skull-crusher',       'db skull crusher',         array['db skullcrusher','db lying extension'], 'trisep', 'dumbel', array['skull-crusher'],               false, 'beban'),
('tate-press',             'tate press',               array['tate'],                                 'trisep', 'dumbel', array['db-skull-crusher'],            false, 'beban'),
('cable-katana-extension', 'cable cross body extension', array['katana extension','cross body extension'], 'trisep', 'kabel', array['overhead-tricep-extension'], false, 'beban'),
('ez-overhead-extension',  'ez bar overhead extension',array['ez overhead','ez french press'],        'trisep', 'ez-bar', array['overhead-tricep-extension'],   false, 'beban'),
('smith-close-grip-press', 'smith close grip press',   array['smith cgbp'],                           'trisep', 'smith',  array['close-grip-bench-press'],      false, 'beban'),

-- lengan bawah
('reverse-wrist-curl',     'reverse wrist curl',       array['wrist extension'],                      'lengan bawah', 'dumbel',    array['wrist-curl'],  false, 'beban'),
('plate-pinch',            'plate pinch',              array['pinch'],                                'lengan bawah', 'alat lain', array['farmer-walk'], false, 'durasi'),
('wrist-roller',           'wrist roller',             array['roller'],                               'lengan bawah', 'alat lain', array['wrist-curl'],  false, 'beban'),
('hand-gripper',           'hand gripper',             array['gripper','grip'],                       'lengan bawah', 'alat lain', array['dead-hang'],   false, 'beban'),

-- paha depan
('box-squat',              'box squat',                array['box sq'],                               'paha depan', 'barbel',      array['squat'],                     false, 'beban'),
('pause-squat',            'pause squat',              array['paused squat'],                         'paha depan', 'barbel',      array['squat'],                     false, 'beban'),
('safety-bar-squat',       'safety bar squat',         array['ssb','ssb squat'],                      'paha depan', 'barbel',      array['squat','front-squat'],       false, 'beban'),
('zercher-squat',          'zercher squat',            array['zercher'],                              'paha depan', 'barbel',      array['front-squat'],               false, 'beban'),
('cyclist-squat',          'cyclist squat',            array['heel elevated squat'],                  'paha depan', 'dumbel',      array['goblet-squat'],              false, 'beban'),
('smith-split-squat',      'smith split squat',        array['smith bss'],                            'paha depan', 'smith',       array['bulgarian-split-squat'],     false, 'beban'),
('lateral-lunge',          'lateral lunge',            array['side lunge'],                           'paha depan', 'dumbel',      array['cossack-squat'],             false, 'beban'),
('curtsy-lunge',           'curtsy lunge',             array['curtsy'],                               'paha depan', 'dumbel',      array['reverse-lunge'],             false, 'beban'),
('cossack-squat',          'cossack squat',            array['cossack'],                              'paha depan', 'berat badan', array['lateral-lunge'],             true,  'beban'),
('pistol-squat',           'pistol squat',             array['pistol'],                               'paha depan', 'berat badan', array['bulgarian-split-squat'],     true,  'beban'),
('v-squat',                'v squat mesin',            array['v squat','vsquat'],                     'paha depan', 'mesin',       array['hack-squat'],                false, 'beban'),
('jump-squat',             'jump squat',               array['squat jump'],                           'paha depan', 'berat badan', array['box-jump'],                  true,  'beban'),

-- paha belakang
('glute-ham-raise',        'glute ham raise',          array['ghr'],                                  'paha belakang', 'mesin',       array['nordic-curl'],          false, 'beban'),
('ball-leg-curl',          'stability ball leg curl',  array['ball curl','swiss ball curl'],          'paha belakang', 'alat lain',   array['lying-leg-curl'],       true,  'beban'),
('standing-leg-curl',      'standing leg curl',        array['single leg curl'],                      'paha belakang', 'mesin',       array['lying-leg-curl'],       false, 'beban'),
('kettlebell-deadlift',    'kettlebell deadlift',      array['kb deadlift','kb dl'],                  'paha belakang', 'kettlebell',  array['db-rdl'],               false, 'beban'),
('smith-rdl',              'smith romanian deadlift',  array['smith rdl'],                            'paha belakang', 'smith',       array['romanian-deadlift'],    false, 'beban'),

-- bokong
('single-leg-hip-thrust',  'single leg hip thrust',    array['sl hip thrust'],                        'bokong', 'berat badan', array['hip-thrust'],          true,  'beban'),
('smith-hip-thrust',       'smith hip thrust',         array['hip thrust smith'],                     'bokong', 'smith',       array['hip-thrust'],          false, 'beban'),
('frog-pump',              'frog pump',                array['frog pumps'],                           'bokong', 'berat badan', array['glute-bridge'],        true,  'beban'),
('donkey-kick',            'donkey kick',              array['donkey kicks'],                         'bokong', 'berat badan', array['cable-glute-kickback'],true,  'beban'),
('band-lateral-walk',      'band lateral walk',        array['monster walk','band walk'],             'bokong', 'alat lain',   array['hip-abduction'],       false, 'beban'),
('sumo-db-squat',          'sumo squat',               array['sumo squat','db sumo squat'],           'bokong', 'dumbel',      array['goblet-squat'],        false, 'beban'),

-- betis
('single-leg-calf-raise',  'single leg calf raise',    array['sl calf raise'],                        'betis', 'dumbel',      array['standing-calf-raise'], false, 'beban'),
('donkey-calf-raise',      'donkey calf raise',        array['donkey calf'],                          'betis', 'mesin',       array['standing-calf-raise'], false, 'beban'),
('tibialis-raise',         'tibialis raise',           array['tib raise','tibia raise'],              'betis', 'berat badan', array[]::text[],              true,  'beban'),

-- perut
('bicycle-crunch',         'bicycle crunch',           array['bicycle'],                              'perut', 'berat badan', array['russian-twist'],     true,  'beban'),
('v-up',                   'v-up',                     array['vup','v up'],                           'perut', 'berat badan', array['lying-leg-raise'],   true,  'beban'),
('reverse-crunch',         'reverse crunch',           array['reverse crunches'],                     'perut', 'berat badan', array['lying-leg-raise'],   true,  'beban'),
('mountain-climber',       'mountain climber',         array['mountain climbers'],                    'perut', 'berat badan', array['plank'],             true,  'beban'),
('hollow-hold',            'hollow hold',              array['hollow body'],                          'perut', 'berat badan', array['plank'],             true,  'durasi'),
('l-sit',                  'l-sit',                    array['lsit','l sit'],                         'perut', 'berat badan', array['hanging-leg-raise'], true,  'durasi'),
('heel-touch',             'heel touch',               array['heel taps','heel touches'],             'perut', 'berat badan', array['crunch'],            true,  'beban'),
('flutter-kick',           'flutter kick',             array['flutter kicks'],                        'perut', 'berat badan', array['lying-leg-raise'],   true,  'beban'),
('dragon-flag',            'dragon flag',              array['dragon flags'],                         'perut', 'berat badan', array['lying-leg-raise'],   true,  'beban'),
('db-side-bend',           'db side bend',             array['side bend'],                            'perut', 'dumbel',      array['cable-woodchopper'], false, 'beban'),
('landmine-rotation',      'landmine rotation',        array['landmine twist'],                       'perut', 'landmine',    array['russian-twist'],     false, 'beban'),

-- full body
('clean-and-jerk',         'clean and jerk',           array['c&j','clean jerk'],                     'full body', 'barbel',      array['power-clean'],       false, 'beban'),
('db-snatch',              'db snatch',                array['dumbbell snatch','snatch'],             'full body', 'dumbel',      array['kettlebell-swing'],  false, 'beban'),
('kettlebell-clean',       'kettlebell clean',         array['kb clean'],                             'full body', 'kettlebell',  array['power-clean'],       false, 'beban'),
('box-jump',               'box jump',                 array['box jumps'],                            'full body', 'alat lain',   array['jump-squat'],        true,  'beban'),
('wall-ball',              'wall ball',                array['wall balls'],                           'full body', 'alat lain',   array['thruster'],          false, 'beban'),
('sled-pull',              'sled pull',                array['sled drag'],                            'full body', 'sled',        array['sled-push'],         false, 'beban'),
('tire-flip',              'tire flip',                array['ban','flip ban'],                       'full body', 'alat lain',   array[]::text[],            false, 'beban'),
('bear-crawl',             'bear crawl',               array['jalan beruang'],                        'full body', 'berat badan', array['mountain-climber'],  true,  'durasi'),

-- kardio & olahraga
('jalan-kaki',             'jalan kaki',               array['jalan','walking','jalan santai'],       'kardio', 'berat badan', array['incline-walk'],     true,  'kardio'),
('sprint',                 'sprint',                   array['hiit','lari cepat'],                    'kardio', 'berat badan', array['assault-bike'],     true,  'kardio'),
('ski-erg',                'ski erg',                  array['skierg'],                               'kardio', 'mesin',       array['rowing-machine'],   false, 'kardio'),
('aerobik',                'senam / aerobik',          array['senam','aerobik','zumba'],              'kardio', 'berat badan', array[]::text[],           true,  'kardio'),
('hiking',                 'hiking',                   array['naik gunung','mendaki'],                'kardio', 'berat badan', array['incline-walk'],     true,  'kardio'),
('badminton',              'badminton',                array['bulu tangkis','bultang'],               'kardio', 'alat lain',   array[]::text[],           false, 'kardio'),
('futsal',                 'futsal',                   array['bola','sepak bola','main bola'],        'kardio', 'alat lain',   array[]::text[],           false, 'kardio'),

-- mobilitas
('stretching',             'peregangan',               array['stretching','stretch','pendinginan'],   'mobilitas', 'berat badan', array['yoga'],         true,  'durasi'),
('foam-rolling',           'foam rolling',             array['foam roller','foam roll'],              'mobilitas', 'alat lain',   array['stretching'],   false, 'durasi'),
('yoga',                   'yoga',                     array['yoga'],                                 'mobilitas', 'berat badan', array['stretching'],   true,  'durasi')

on conflict (slug) do update set
  name = excluded.name, aliases = excluded.aliases, muscle = excluded.muscle, equipment = excluded.equipment,
  alternatives = excluded.alternatives, is_bodyweight = excluded.is_bodyweight, kind = excluded.kind;


-- ===== template bawaan per split (user_id null) =====
-- template bawaan diganti utuh (seed boleh dijalankan ulang tanpa baris dobel)
delete from split_templates where user_id is null;
insert into split_templates (user_id, split, exercise_id, position)
select null, v.split, e.id, v.pos
from (values
  -- push
  ('push','bench-press',1), ('push','incline-db-press',2), ('push','overhead-press',3), ('push','chest-press-machine',4),
  ('push','dips',5), ('push','cable-fly',6), ('push','lateral-raise',7), ('push','tricep-pushdown',8),
  ('push','overhead-tricep-extension',9), ('push','pec-deck',10),
  -- pull
  ('pull','deadlift',1), ('pull','pull-up',2), ('pull','lat-pulldown',3), ('pull','barbell-row',4),
  ('pull','seated-cable-row',5), ('pull','db-row',6), ('pull','face-pull',7), ('pull','rear-delt-fly',8),
  ('pull','barbell-curl',9), ('pull','hammer-curl',10),
  -- legs
  ('legs','squat',1), ('legs','romanian-deadlift',2), ('legs','leg-press',3), ('legs','hack-squat',4),
  ('legs','bulgarian-split-squat',5), ('legs','lying-leg-curl',6), ('legs','leg-extension',7), ('legs','hip-thrust',8),
  ('legs','standing-calf-raise',9), ('legs','hanging-leg-raise',10),
  -- upper
  ('upper','bench-press',1), ('upper','barbell-row',2), ('upper','overhead-press',3), ('upper','lat-pulldown',4),
  ('upper','incline-db-press',5), ('upper','seated-cable-row',6), ('upper','lateral-raise',7), ('upper','barbell-curl',8),
  ('upper','tricep-pushdown',9), ('upper','face-pull',10),
  -- lower
  ('lower','squat',1), ('lower','romanian-deadlift',2), ('lower','leg-press',3), ('lower','bulgarian-split-squat',4),
  ('lower','lying-leg-curl',5), ('lower','leg-extension',6), ('lower','hip-thrust',7), ('lower','standing-calf-raise',8),
  ('lower','cable-crunch',9), ('lower','plank',10),
  -- full body
  ('full','squat',1), ('full','bench-press',2), ('full','barbell-row',3), ('full','overhead-press',4),
  ('full','romanian-deadlift',5), ('full','lat-pulldown',6), ('full','db-curl',7), ('full','tricep-pushdown',8),
  ('full','plank',9), ('full','treadmill',10)
) as v(split, slug, pos)
join exercises e on e.slug = v.slug and e.user_id is null;
