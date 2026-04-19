-- Faith Through Time Seed Data
-- Dates follow Ussher chronology (Annales Veteris Testamenti, 1650) for OT
-- NT dates follow Roman historical records
-- All BCE dates are negative integers

-- ============================================================
-- TIME PERIODS
-- ============================================================
INSERT INTO time_periods (name, start_year, end_year, color, sort_order, description) VALUES
('Creation & Primeval History',   -4004, -1996, '#8B4513', 1, 'Adam through the Tower of Babel'),
('Patriarchs',                    -1996, -1706, '#DAA520', 2, 'Abraham, Isaac, Jacob, Joseph'),
('Egypt & Exodus',                -1706, -1451, '#CD853F', 3, 'Israel in Egypt and the Exodus'),
('Conquest & Judges',             -1451, -1095, '#556B2F', 4, 'Joshua''s conquest through the period of the Judges'),
('United Kingdom',                -1095,  -975, '#4169E1', 5, 'Saul, David, Solomon'),
('Divided Kingdom',                -975,  -586, '#DC143C', 6, 'Israel and Judah as separate kingdoms'),
('Exile',                          -586,  -538, '#696969', 7, 'Babylonian captivity'),
('Return & Restoration',          -538,  -400, '#2E8B57', 8, 'Zerubbabel, Ezra, Nehemiah'),
('Intertestamental Period',       -400,    -5, '#708090', 9, 'Between the Testaments'),
('Life of Christ',                  -5,    33, '#FFD700', 10, 'Birth through Ascension of Jesus'),
('Apostolic Age',                   33,   100, '#9370DB', 11, 'Early church through death of John'),
('Early Church & Persecution',     100,   313, '#B22222', 12, 'Persecution under Rome; Church Fathers; canon formation'),
('Imperial Christianity',          313,   476, '#6A0DAD', 13, 'Edict of Milan through fall of the Western Roman Empire'),
('Early Medieval',                 476,  1054, '#2F4F4F', 14, 'Rise of monasticism; spread of Christianity; East-West tensions'),
('High Medieval & Crusades',      1054,  1400, '#708090', 15, 'Great Schism; Crusades; Scholasticism; early reform movements'),
('Reformation',                   1400,  1648, '#228B22', 16, 'Gutenberg Bible; Protestant Reformation; Catholic Counter-Reformation'),
('Enlightenment & Missions',      1648,  1900, '#191970', 17, 'Great Awakenings; modern missions movement; Bible societies'),
('Modern Era',                    1900,  2026, '#C0C0C0', 18, 'Global Christianity; ecumenical movement; digital age');

-- ============================================================
-- PEOPLE (Major figures first, then minor)
-- ============================================================
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
-- Primeval
('Adam',    NULL,    -4004, -3074, 1, 1, 'traditional', 'patriarch', 'major', NULL, NULL, NULL, 'First man, created by God.', 'Ussher chronology (Annales, 1650): created 4004 BC, died 3074 BC (930 years, Gen 5:5).'),
('Eve',     'Havah', -4004, -3074, 1, 1, 'traditional', 'other',     'major', NULL, NULL, NULL, 'First woman, mother of all living.', 'Ussher: created 4004 BC. Death year not recorded in Scripture; estimated as contemporary with Adam (d. 3074 BC).'),
('Noah',    NULL,    -2948, -1998, 1, 1, 'traditional', 'patriarch', 'major', NULL, NULL, NULL, 'Builder of the Ark; survived the Flood.', 'Ussher: born 2948 BC (AM 1056), died 1998 BC (950 years, Gen 9:29).'),

-- Patriarchs
('Abraham', 'Abram', -1996, -1821, 1, 1, 'traditional', 'patriarch', 'major', NULL, NULL, NULL, 'Father of the nation of Israel. Called by God from Ur.', 'Ussher: born 1996 BC (AM 2008), died 1821 BC (175 years, Gen 25:7). Terah was 130 at Abraham''s birth (Acts 7:4; Gen 11:32).'),
('Sarah',   'Sarai', -1986, -1859, 1, 1, 'traditional', 'other',     'minor', NULL, NULL, NULL, 'Wife of Abraham, mother of Isaac.', 'Ussher: born 1986 BC (10 years younger, Gen 17:17), died 1859 BC (127 years, Gen 23:1).'),
('Isaac',   NULL,    -1896, -1716, 1, 1, 'traditional', 'patriarch', 'major', NULL, NULL, NULL, 'Son of Abraham and Sarah; child of promise.', 'Ussher: born 1896 BC (Abraham aged 100, Gen 21:5), died 1716 BC (180 years, Gen 35:28).'),
('Rebekah', NULL,    -1890, NULL,  1, 1, 'traditional', 'other',     'minor', NULL, NULL, NULL, 'Wife of Isaac, mother of Jacob and Esau.', 'Approximate; married Isaac c. 1856 BC (Gen 24).'),
('Jacob',   'Israel',-1836, -1689, 1, 1, 'traditional', 'patriarch', 'major', NULL, NULL, NULL, 'Son of Isaac; father of the twelve tribes.', 'Ussher: born 1836 BC (Isaac aged 60, Gen 25:26), died 1689 BC (147 years, Gen 47:28).'),
('Joseph',  NULL,    -1745, -1635, 1, 1, 'traditional', 'patriarch', 'major', 'Ephraim/Manasseh', NULL, NULL, 'Sold into slavery; rose to power in Egypt.', 'Ussher: born c. 1745 BC, died 1635 BC (110 years, Gen 50:26).'),

-- Exodus & Conquest
('Moses',   NULL,    -1571, -1451, 1, 1, 'traditional', 'prophet',   'major', 'Levi', NULL, NULL, 'Deliverer of Israel from Egypt; received the Law.', 'Ussher: born 1571 BC, died 1451 BC (120 years, Deut 34:7). Exodus 1491 BC.'),
('Aaron',   NULL,    -1574, -1451, 1, 1, 'traditional', 'priest',    'major', 'Levi', NULL, NULL, 'First high priest of Israel; brother of Moses.', 'Ussher: born 1574 BC (3 years older, Exod 7:7), died 1451 BC (123 years, Num 33:39).'),
('Miriam',  NULL,    -1577, -1452, 1, 1, 'traditional', 'prophet',   'minor', 'Levi', NULL, NULL, 'Sister of Moses and Aaron; prophetess.', 'Ussher: born c. 1577 BC, died c. 1452 BC.'),
('Joshua',  'Yehoshua',-1530,-1420,1, 1, 'traditional', 'judge',     'major', 'Ephraim', NULL, NULL, 'Successor of Moses; led the conquest of Canaan.', 'Ussher: born c. 1530 BC, died c. 1420 BC (110 years, Josh 24:29).'),

-- Judges
('Deborah', NULL,    -1245, NULL,  1, 1, 'possible',    'judge',     'major', NULL, NULL, NULL, 'Prophetess and judge of Israel.', 'Ussher: c. 1245 BC; Judges chronology is debated.'),
('Gideon',  'Jerubbaal',-1235,NULL,1, 1, 'possible',    'judge',     'major', 'Manasseh', NULL, NULL, 'Defeated the Midianites with 300 men.', 'Ussher: c. 1235 BC.'),
('Samson',  NULL,    -1163, -1123, 1, 1, 'possible',    'judge',     'major', 'Dan', NULL, NULL, 'Nazirite judge known for great strength.', 'Ussher: born c. 1163 BC, died c. 1123 BC.'),
('Ruth',    NULL,    -1195, NULL,  1, 1, 'possible',    'other',     'minor', NULL, NULL, NULL, 'Moabite great-grandmother of David.', 'Ussher: c. 1195 BC.'),
('Samuel',  NULL,    -1150, -1060, 1, 1, 'traditional', 'prophet',   'major', 'Levi', NULL, NULL, 'Last judge; anointed Saul and David as kings.', 'Ussher: born c. 1150 BC, died c. 1060 BC.'),

-- United Kingdom
('Saul',    NULL,    -1100, -1056, 1, 1, 'traditional', 'king',      'major', 'Benjamin', NULL, NULL, 'First king of united Israel.', 'Ussher: began reign 1095 BC, died at Gilboa 1056 BC.'),
('David',   NULL,    -1085,  -1015, 1, 1, 'traditional', 'king',      'major', 'Judah', NULL, NULL, 'Second king of Israel; man after God''s own heart. Established Jerusalem.', 'Ussher: born c. 1085 BC, reigned 1055-1015 BC (40 years, 2 Sam 5:4).'),
('Solomon', NULL,    -1033,  -975, 1, 1, 'traditional', 'king',      'major', 'Judah', NULL, NULL, 'Third king; built the First Temple. Known for wisdom.', 'Ussher: born c. 1033 BC, reigned 1015-975 BC (40 years, 1 Kgs 11:42).'),
('Nathan',  NULL,    -1085,  -1005, 1, 1, 'possible',    'prophet',   'minor', NULL, NULL, NULL, 'Prophet during David and Solomon''s reigns.', 'Ussher: contemporary of David, c. 1085-1005 BC.'),

-- Divided Kingdom - Selected kings and prophets
('Elijah',  NULL,    -930,  NULL, 1, 1, 'traditional', 'prophet',   'major', NULL, NULL, NULL, 'Prophet who confronted Baal worship; translated to heaven in a whirlwind (2 Kgs 2:11). Did not die.', 'Ussher: active during Ahab''s reign (918-897 BC). Translated c. 896 BC (2 Kgs 2:11). Born c. 930 BC (estimated).'),
('Elisha',  NULL,    -920,  -825, 1, 1, 'traditional', 'prophet',   'major', NULL, NULL, NULL, 'Successor of Elijah; performed many miracles.', 'Ussher: called by Elijah c. 896 BC. Died during reign of Jehoash of Israel c. 825 BC (2 Kgs 13:14-20). Born c. 920 BC (estimated).'),
('Isaiah',  'Yeshayahu',-783,-695,1, 1, 'traditional', 'prophet',   'major', NULL, NULL, NULL, 'Major prophet; messianic prophecies.', 'Ussher: called in the year Uzziah died, 758 BC (Isa 6:1). Tradition: martyred by Manasseh c. 695 BC (cf. Heb 11:37). Born c. 783 BC (estimated).'),
('Jeremiah','Yirmeyahu',-650,-570,1, 1, 'probable',    'prophet',   'major', 'Levi', NULL, NULL, 'The weeping prophet; prophesied the fall of Jerusalem.', NULL),
('Ezekiel', 'Yechezkel',-622,-570,1, 1, 'probable',    'prophet',   'major', 'Levi', NULL, NULL, 'Prophet during the Exile; visions of God''s glory.', NULL),
('Daniel',  NULL,    -620,  -536, 1, 1, 'probable',    'prophet',   'major', 'Judah', NULL, NULL, 'Prophet in Babylonian court; apocalyptic visions.', NULL),
('Hezekiah',NULL,    -751,  -697, 1, 1, 'traditional', 'king',      'major', 'Judah', NULL, NULL, 'Godly king of Judah who trusted the Lord against Assyria.', 'Ussher: reigned 726-697 BC (29 years, 2 Kgs 18:2). Age 25 at accession: born 751 BC.'),
('Josiah',  NULL,    -648,  -609, 1, 1, 'traditional', 'king',      'major', 'Judah', NULL, NULL, 'Reformer king who discovered the Book of the Law.', 'Ussher: reigned 640-609 BC (31 years, 2 Kgs 22:1). Age 8 at accession: born 648 BC. Killed at Megiddo by Pharaoh Necho.'),
('Jeroboam','Jeroboam I',-1010,-953,1,1, 'traditional',    'king',      'minor', 'Ephraim', NULL, NULL, 'First king of the northern kingdom of Israel.', 'Ussher: reigned 975-953 BC (22 years, 1 Kgs 14:20).'),
('Ahab',    NULL,    -940,  -897, 1, 1, 'traditional', 'king',      'minor', NULL, NULL, NULL, 'Wicked king of Israel; husband of Jezebel.', 'Ussher: reigned 918-897 BC (22 years, 1 Kgs 16:29). Killed at Ramoth-gilead (1 Kgs 22:34-37). Birth estimated.'),

-- Return & Restoration
('Ezra',    NULL,    -480,  -440, 1, 1, 'possible',    'priest',    'major', 'Levi', NULL, NULL, 'Priest and scribe who led reforms after the exile.', NULL),
('Nehemiah',NULL,    -470,  -400, 1, 1, 'possible',    'other',     'major', 'Judah', NULL, NULL, 'Cupbearer to the king; rebuilt Jerusalem''s walls.', NULL),
('Zerubbabel',NULL,  -560,  -500, 1, 1, 'possible',    'other',     'minor', 'Judah', NULL, NULL, 'Led the first return from exile; rebuilt the Temple.', NULL),
('Esther',  'Hadassah',-480,-420, 1, 1, 'possible',    'other',     'major', 'Benjamin', NULL, NULL, 'Queen of Persia who saved the Jewish people.', NULL),

-- New Testament
('Jesus',   'Yeshua, Jesus Christ', -5, 33, 1, 0, 'probable', 'other', 'major', 'Judah', NULL, NULL, 'The Messiah, Son of God. Central figure of Christianity.', 'Birth ~6-4 BC based on Herod''s death; crucifixion ~AD 30-33.'),
('Mary',    'Miriam', -20, 48, 1, 1, 'possible', 'other', 'major', 'Judah', NULL, NULL, 'Mother of Jesus.', NULL),
('John the Baptist', 'Yochanan', -5, 29, 1, 1, 'probable', 'prophet', 'major', 'Levi', NULL, NULL, 'Forerunner of Jesus; baptized in the Jordan.', NULL),
('Peter',   'Simon, Cephas', -2, 67, 1, 1, 'probable', 'apostle', 'major', NULL, NULL, NULL, 'Leader among the apostles; first to preach at Pentecost.', 'Tradition places death ~AD 64-67 in Rome.'),
('Paul',    'Saul of Tarsus', 5, 67, 1, 1, 'probable', 'apostle', 'major', 'Benjamin', NULL, NULL, 'Apostle to the Gentiles; wrote much of the New Testament.', 'Dates based on correlation with Roman history.'),
('John',    'John the Apostle', 6, 100, 1, 1, 'possible', 'apostle', 'major', NULL, NULL, NULL, 'Apostle; author of Gospel, epistles, and Revelation.', NULL),
('James',   'James son of Zebedee', 3, 44, 1, 0, 'probable', 'apostle', 'minor', NULL, NULL, NULL, 'Apostle; first apostle martyred (Acts 12).', NULL),
('Stephen', NULL, NULL, 35, 1, 1, 'probable', 'other', 'minor', NULL, NULL, NULL, 'First Christian martyr.', NULL),
('Barnabas',NULL, NULL, 61, 1, 1, 'possible', 'other', 'minor', 'Levi', NULL, NULL, 'Companion of Paul on first missionary journey.', NULL),
('Timothy', NULL, 17, 80, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Paul''s protégé; recipient of two epistles.', NULL),
('Luke',    NULL, NULL, 84, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Physician; author of Luke and Acts.', NULL),
('Naaman', NULL, -870, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Syrian army commander healed of leprosy by Elisha.', 'Ussher: healed during Elisha''s ministry c. 870-825 BC (2 Kings 5).');

-- ============================================================
-- NEW PEOPLE (IDs 49-148) — 100 additional biblical figures
-- ============================================================
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
-- Primeval / Patriarchal (49-65)
('Seth',       NULL,       -3874, -2962, 1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Third son of Adam and Eve; ancestor of Noah.', 'Ussher: born 3874 BC (AM 130), died 2962 BC (912 years, Gen 5:8).'),
('Enoch',      NULL,       -3382, -3017,  1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Walked with God and was taken up; did not see death.', 'Ussher: born 3382 BC (AM 622), translated 3017 BC (365 years, Gen 5:24; Heb 11:5).'),
('Methuselah', NULL,       -3317, -2348, 1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Longest-lived person in the Bible at 969 years.', 'Ussher: born 3317 BC (AM 687), died 2348 BC year of the Flood (Gen 5:27).'),
('Lamech',     NULL,       -3130, -2353, 1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Father of Noah; expressed hope for relief from the curse.', 'Ussher: born 3130 BC (AM 874), died 2353 BC (777 years, Gen 5:31).'),
('Shem',       NULL,       -2448, -1848, 1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Noah; ancestor of the Semitic peoples and of Abraham.', 'Ussher: born 2448 BC (AM 1556), died 1848 BC (600 years, Gen 11:10-11).'),
('Ham',        NULL,       -2448, NULL,  1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Noah; ancestor of the Canaanites, Egyptians, and others.', 'Ussher: born c. 2448 BC (Gen 5:32).'),
('Japheth',    NULL,       -2448, NULL,  1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Noah; ancestor of many European and Asian peoples.', 'Ussher: born c. 2448 BC (Gen 5:32; 10:21 implies eldest of Noah''s sons).'),
('Lot',        NULL,       -1960, NULL,  1, 1, 'traditional', 'other',     'minor', NULL, NULL, NULL, 'Abraham''s nephew; escaped the destruction of Sodom.', 'Ussher: contemporary of Abraham, c. 1960 BC.'),
('Ishmael',    NULL,       -1910, -1773, 1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Abraham by Hagar; father of twelve princes.', 'Ussher: born 1910 BC (Abraham aged 86, Gen 16:16), died 1773 BC (137 years, Gen 25:17).'),
('Hagar',      NULL,       -1930, NULL,  1, 1, 'traditional', 'other',     'minor', NULL, NULL, NULL, 'Sarah''s Egyptian servant; mother of Ishmael.', NULL),
('Esau',       'Edom',     -1836, NULL,  1, 1, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Jacob''s twin brother; sold his birthright; ancestor of the Edomites.', 'Ussher: born 1836 BC (twin of Jacob, Gen 25:26).'),
('Laban',      NULL,       -1920, NULL,  1, 1, 'traditional', 'other',     'minor', NULL, NULL, NULL, 'Rebekah''s brother; father of Leah and Rachel. Tricked Jacob.', NULL),
('Leah',       NULL,       -1850, NULL,  1, 1, 'traditional', 'other',     'minor', NULL, NULL, NULL, 'Jacob''s first wife; mother of six sons and Dinah.', NULL),
('Rachel',     NULL,       -1850, -1730, 1, 1, 'traditional', 'other',     'minor', NULL, NULL, NULL, 'Jacob''s beloved wife; mother of Joseph and Benjamin.', 'Ussher: died c. 1730 BC giving birth to Benjamin (Gen 35:16-20).'),
('Judah',      NULL,       -1750, NULL,  1, 1, 'traditional', 'patriarch', 'major', 'Judah', NULL, NULL, 'Fourth son of Jacob; ancestor of David and Jesus. Tribe of kings.', 'Ussher: born c. 1750 BC.'),
('Benjamin',   NULL,       -1730, NULL,  1, 1, 'traditional', 'patriarch', 'minor', 'Benjamin', NULL, NULL, 'Youngest son of Jacob and Rachel; born near Bethlehem.', 'Ussher: born c. 1730 BC (Gen 35:16-20).'),
('Reuben',     NULL,       -1755, NULL,  1, 1, 'traditional', 'patriarch', 'minor', 'Reuben', NULL, NULL, 'Jacob''s firstborn; lost his birthright. Tried to save Joseph.', 'Ussher: born c. 1755 BC.'),

-- Egypt / Exodus (66-70)
('Pharaoh of the Exodus', NULL, -1545, NULL, 1, 1, 'possible', 'king', 'major', NULL, NULL, NULL, 'The unnamed Egyptian pharaoh who opposed Moses and the Exodus.', 'Ussher: Exodus 1491 BC. Often identified as Thutmose III or Amenhotep II.'),
('Caleb',      'Caleb son of Jephunneh', -1530, -1420, 1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'One of two faithful spies (with Joshua) who urged Israel to enter Canaan.', 'Ussher: born c. 1530 BC, died c. 1420 BC (Josh 14:10).'),
('Phinehas',   'Phinehas son of Eleazar', -1465, NULL, 1, 1, 'traditional', 'priest', 'minor', 'Levi', NULL, NULL, 'Zealous priest who stopped a plague by his decisive action.', 'Ussher: c. 1465 BC (Num 25:6-13).'),
('Jethro',     'Reuel', -1605, NULL, 1, 1, 'traditional', 'priest', 'minor', NULL, NULL, NULL, 'Moses'' father-in-law; priest of Midian who advised Moses on delegation.', 'Ussher: c. 1605 BC.'),
('Zipporah',   NULL, -1555, NULL, 1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Wife of Moses; daughter of Jethro.', 'Ussher: c. 1555 BC.'),

-- Judges (71-78)
('Othniel',    NULL,       -1405, -1325, 1, 1, 'possible', 'judge', 'minor', 'Judah', NULL, NULL, 'First judge of Israel; nephew of Caleb.', 'Ussher: c. 1405-1325 BC (Judg 3:7-11).'),
('Ehud',       NULL,       -1355, NULL,  1, 1, 'possible', 'judge', 'minor', 'Benjamin', NULL, NULL, 'Left-handed judge who assassinated King Eglon of Moab.', 'Ussher: c. 1355 BC (Judg 3:12-30).'),
('Jephthah',   NULL,       -1195, -1189, 1, 1, 'possible', 'judge', 'minor', NULL, NULL, NULL, 'Judge of Israel who made a tragic vow.', 'Ussher: c. 1195-1189 BC (Judg 11:1–12:7).'),
('Eli',        NULL,       -1205, -1125, 1, 1, 'traditional', 'priest', 'minor', 'Levi', NULL, NULL, 'Priest and judge at Shiloh; raised Samuel.', 'Ussher: c. 1205-1125 BC (1 Sam 1-4).'),
('Hannah',     NULL,       -1175, NULL,  1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Mother of Samuel; prayed fervently for a child and dedicated him to God.', 'Ussher: c. 1175 BC (1 Sam 1-2).'),
('Boaz',       NULL,       -1205, NULL,  1, 1, 'possible', 'other', 'minor', 'Judah', NULL, NULL, 'Kinsman-redeemer who married Ruth; ancestor of David.', 'Ussher: c. 1205 BC (Ruth 2-4).'),
('Naomi',      NULL,       -1225, NULL,  1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Ruth''s mother-in-law who returned from Moab to Bethlehem.', 'Ussher: c. 1225 BC (Ruth 1-4).'),
('Abimelech',  NULL,       -1215, -1185, 1, 1, 'possible', 'king', 'minor', 'Manasseh', NULL, NULL, 'Son of Gideon who made himself king; killed at Thebez.', 'Ussher: c. 1215-1185 BC (Judg 9).'),

-- United Kingdom (79-84)
('Abigail',    NULL,       -1075, NULL,  1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Wise woman who became David''s wife after the death of Nabal.', 'Ussher: c. 1075 BC (1 Sam 25).'),
('Bathsheba',  NULL,       -1065, NULL,  1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Wife of David; mother of Solomon.', 'Ussher: c. 1065 BC.'),
('Joab',       NULL,       -1085, -1013,  1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Commander of David''s army; politically shrewd and ruthless.', 'Ussher: c. 1085-1013 BC (1 Kgs 2:28-34).'),
('Absalom',    NULL,       -1065, -1023,  1, 1, 'traditional', 'other', 'minor', 'Judah', NULL, NULL, 'David''s rebellious son who temporarily seized the throne.', 'Ussher: c. 1065-1023 BC (2 Sam 13-18).'),
('Jonathan',   NULL,       -1105, -1056, 1, 1, 'traditional', 'other', 'minor', 'Benjamin', NULL, NULL, 'Saul''s son and David''s closest friend; died at Gilboa.', 'Ussher: died at Gilboa 1056 BC (1 Sam 31).'),
('Michal',     NULL,       -1095, NULL,  1, 1, 'traditional', 'other', 'minor', 'Benjamin', NULL, NULL, 'Saul''s daughter; David''s first wife who helped him escape.', 'Ussher: c. 1095 BC.'),

-- Kings of Judah (85-97)
('Rehoboam',   NULL,       -1016, -958, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Solomon''s son; his harshness caused the kingdom to divide.', 'Ussher: Rehoboam was 41 when he began to reign (1 Kgs 14:21), born c. 1016 BC. Kingdom divided 975 BC.'),
('Asa',        NULL,       -955,  -914, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Good king of Judah who removed idols and sought the Lord.', 'Ussher: reigned 955-914 BC (41 years, 1 Kgs 15:10). 1 Kings 15:9-24; 2 Chronicles 14-16.'),
('Jehoshaphat',NULL,       -949,  -889, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Good king of Judah who strengthened the nation and sent teachers through the land.', 'Ussher: reigned 914-889 BC (25 years, 1 Kgs 22:42). Age 35 at accession: born 949 BC.'),
('Jehoram of Judah', 'Joram', -921, -885, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Wicked king of Judah who married Ahab''s daughter and led Judah astray.', 'Ussher: reigned 893-885 BC (8 years, 2 Kgs 8:17). Age 32 at accession; coregency with Jehoshaphat. Born c. 921 BC.'),
('Uzziah',     'Azariah',  -826,  -758, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Good king of Judah who became proud and was struck with leprosy.', 'Ussher: reigned 810-758 BC (52 years, 2 Kgs 15:2). Age 16 at accession: born 826 BC.'),
('Ahaz',       NULL,       -762,  -726, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Wicked king of Judah who practiced child sacrifice and shut the Temple doors.', 'Ussher: reigned 742-726 BC (16 years, 2 Kgs 16:2). Age 20 at accession: born 762 BC. Isaiah 7.'),
('Manasseh',   NULL,       -709,  -642, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Most wicked king of Judah who later repented in exile.', 'Ussher: reigned 697-642 BC (55 years, 2 Kgs 21:1). Age 12 at accession: born 709 BC.'),
('Jehoiakim',  'Eliakim',  -634,  -598, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'King of Judah who burned Jeremiah''s scroll and rebelled against Babylon.', 'Ussher: reigned 609-598 BC (11 years, 2 Kgs 23:36). Age 25 at accession: born 634 BC.'),
('Zedekiah',   'Mattaniah',-618,  -586, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Last king of Judah; blinded and taken captive to Babylon.', 'Ussher: reigned 597-586 BC (11 years, 2 Kgs 24:18). Age 21 at accession: born 618 BC.'),
('Athaliah',   NULL,       -930,  -878, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'Wicked queen of Judah who usurped the throne and killed royal heirs.', 'Ussher: usurped 885-878 BC (6-7 years, 2 Kgs 11:3). Killed in 7th year when Joash crowned. Birth estimated.'),
('Joash of Judah', 'Jehoash', -885, -838, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Boy king hidden in the Temple; restored proper worship under Jehoiada''s guidance.', 'Ussher: reigned 878-838 BC (40 years, 2 Kgs 12:1). Age 7 at accession: born 885 BC.'),
('Amaziah',    NULL,       -863,  -810, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'King of Judah who followed the Lord at first but later turned to idols.', 'Ussher: reigned 838-810 BC (29 years, 2 Kgs 14:2). Age 25 at accession: born 863 BC.'),
('Jotham',     NULL,       -783,  -742, 1, 1, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Good king of Judah who built the upper gate of the Temple.', 'Ussher: reigned 758-742 BC (16 years, 2 Kgs 15:33). Age 25 at accession: born 783 BC.'),

-- Kings of Israel (98-107) — Ussher chronology from 975 BC division
('Nadab',      NULL,       -995,  -953, 1, 1, 'traditional', 'king', 'minor', 'Ephraim', NULL, NULL, 'Son and successor of Jeroboam I; killed by Baasha after two years.', 'Ussher: reigned 954-953 BC (2 years, 1 Kgs 15:25-32).'),
('Baasha',     NULL,       -980,  -930, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'King of Israel who destroyed the house of Jeroboam.', 'Ussher: reigned 953-930 BC (24 years, 1 Kgs 15:33). Birth estimated.'),
('Omri',       NULL,       -960,  -918, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'King of Israel who founded Samaria; politically powerful but godless.', 'Ussher: reigned 929-918 BC (12 years, 1 Kgs 16:23). Mentioned in the Moabite Stone. Birth estimated.'),
('Ahaziah of Israel', NULL, -920, -896, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'Son of Ahab; wicked king who sought Baal-zebub instead of God.', 'Ussher: reigned 897-896 BC (2 years, 1 Kgs 22:51). Birth estimated.'),
('Jehoram of Israel', 'Joram of Israel', -920, -884, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'Son of Ahab; last king of the Omride dynasty; killed by Jehu.', 'Ussher: reigned 896-884 BC (12 years, 2 Kgs 3:1). Birth estimated.'),
('Jehu',       NULL,       -920,  -856, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'Anointed by Elisha''s servant; destroyed the house of Ahab and Baal worship.', 'Ussher: reigned 884-856 BC (28 years, 2 Kgs 10:36). Birth estimated.'),
('Jeroboam II',NULL,       -856,  -784, 1, 1, 'traditional', 'king', 'minor', 'Ephraim', NULL, NULL, 'Powerful king of Israel who expanded borders but tolerated idolatry.', 'Ussher: reigned 825-784 BC (41 years, 2 Kgs 14:23-29). Prophets Amos and Hosea active during his reign. Birth estimated.'),
('Hoshea',     'Hosea (king)', -765, -721, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'Last king of Israel; kingdom fell to Assyria during his reign.', 'Ussher: reigned 730-721 BC (9 years, 2 Kgs 17:1-6). Fall of Samaria AM 3283.'),
('Zimri',      NULL,       -960,  -929, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'King of Israel for only seven days; died by suicide during Omri''s siege.', 'Ussher: reigned 7 days in 929 BC (1 Kgs 16:9-20). Birth estimated.'),
('Jezebel',    NULL,       -940,  -884, 1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Phoenician wife of Ahab; promoted Baal worship and persecuted prophets.', 'Ussher: killed by Jehu 884 BC (2 Kgs 9:30-37). Married Ahab c. 918 BC. Birth estimated.'),

-- Prophets (108-119)
('Hosea',      'Hosea (prophet)', -805, -720, 1, 1, 'traditional', 'prophet', 'minor', NULL, NULL, NULL, 'Prophet who married Gomer to illustrate God''s love for unfaithful Israel.', 'Ussher: prophesied during reigns of Uzziah through Hezekiah (Hos 1:1) and Jeroboam II (825-784 BC). Active c. 790-720 BC. Birth estimated.'),
('Joel',       NULL,       -835,  NULL,  1, 1, 'possible', 'prophet', 'minor', NULL, NULL, NULL, 'Prophet who described a locust plague and the Day of the Lord.', 'Joel 1-3. Date is debated.'),
('Amos',       NULL,       -790,  NULL,  1, 1, 'traditional', 'prophet', 'minor', NULL, NULL, NULL, 'Shepherd-prophet from Tekoa who denounced social injustice in Israel.', 'Ussher: prophesied during Uzziah (810-758 BC) and Jeroboam II (825-784 BC). Amos 1:1; 7:14-15. Birth estimated.'),
('Obadiah',    NULL,       -586,  NULL,  1, 1, 'possible', 'prophet', 'minor', NULL, NULL, NULL, 'Prophet who pronounced judgment on Edom for betraying Judah.', 'Obadiah 1. Shortest OT book.'),
('Jonah',      NULL,       -800,  NULL,  1, 1, 'traditional', 'prophet', 'minor', NULL, NULL, NULL, 'Prophet sent to Nineveh; swallowed by a great fish after fleeing.', 'Ussher: prophesied during Jeroboam II (825-784 BC, 2 Kgs 14:25). Jonah 1-4. Birth estimated.'),
('Micah',      NULL,       -755,  -700, 1, 1, 'traditional', 'prophet', 'minor', NULL, NULL, NULL, 'Prophet who foretold Bethlehem as the Messiah''s birthplace.', 'Ussher: prophesied during Jotham (758-742), Ahaz (742-726), and Hezekiah (726-697). Micah 1:1; 5:2. Birth estimated.'),
('Nahum',      NULL,       -660,  NULL,  1, 1, 'possible', 'prophet', 'minor', NULL, NULL, NULL, 'Prophet who foretold the fall of Nineveh.', 'Nahum 1-3.'),
('Habakkuk',   NULL,       -620,  NULL,  1, 1, 'possible', 'prophet', 'minor', NULL, NULL, NULL, 'Prophet who questioned God about evil and received answers about faith.', 'Habakkuk 1-3.'),
('Zephaniah',  NULL,       -640,  NULL,  1, 1, 'possible', 'prophet', 'minor', 'Judah', NULL, NULL, 'Prophet during Josiah''s reign who warned of the Day of the Lord.', 'Zephaniah 1-3.'),
('Haggai',     NULL,       -540,  NULL,  1, 1, 'possible', 'prophet', 'minor', NULL, NULL, NULL, 'Post-exilic prophet who urged rebuilding of the Temple.', 'Haggai 1-2.'),
('Zechariah',  'Zechariah (prophet)', -540, NULL, 1, 1, 'possible', 'prophet', 'minor', NULL, NULL, NULL, 'Post-exilic prophet with messianic visions; contemporary of Haggai.', 'Zechariah 1-14.'),
('Malachi',    NULL,       -460,  NULL,  1, 1, 'possible', 'prophet', 'minor', NULL, NULL, NULL, 'Last OT prophet who called Israel to faithfulness before 400 years of silence.', 'Malachi 1-4.'),

-- Post-Exile / Intertestamental (120-121)
('Mordecai',   NULL,       -500,  -440, 1, 1, 'possible', 'other', 'minor', 'Benjamin', NULL, NULL, 'Esther''s cousin who raised her; uncovered a plot against the king.', 'Esther 2-10.'),
('Job',        NULL,       -2000, NULL,  1, 1, 'possible', 'other', 'major', NULL, NULL, NULL, 'Righteous man tested by suffering; God restored him double.', 'Job 1-42. Date is highly debated; possibly patriarchal era.'),

-- New Testament (122-148)
('Joseph of Nazareth', NULL, -25, 20, 1, 1, 'possible', 'other', 'minor', 'Judah', NULL, NULL, 'Husband of Mary; earthly father of Jesus. A righteous carpenter.', 'Matthew 1-2; Luke 2. Disappears from narrative after Jesus'' youth.'),
('Lazarus',    'Lazarus of Bethany', -5, 60, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Brother of Mary and Martha; raised from the dead by Jesus after four days.', 'John 11:1-44; 12:1-11.'),
('Martha',     NULL,       -10, NULL,   1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Sister of Lazarus and Mary; known for her hospitality and service.', 'Luke 10:38-42; John 11-12.'),
('Mary Magdalene', NULL,   -5, NULL,    1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Follower of Jesus; first witness of the resurrection.', 'Luke 8:2; John 20:1-18.'),
('Nicodemus',  NULL,       -20, NULL,   1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Pharisee who came to Jesus at night; helped bury Jesus.', 'John 3:1-21; 7:50-52; 19:38-42.'),
('Matthew',    'Levi',     2, 70,       1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'Tax collector called by Jesus; author of the Gospel of Matthew.', 'Matthew 9:9-13; 10:3.'),
('Andrew',     NULL,       5, 65,       1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'Brother of Peter; one of the first disciples called.', 'John 1:35-42; Matthew 4:18-20.'),
('Philip',     'Philip the Apostle', 5, 80, 1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'Apostle from Bethsaida who brought Nathanael to Jesus.', 'John 1:43-48; 6:5-7; 14:8-9.'),
('Bartholomew','Nathanael', 5, 70,      1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'Apostle whom Jesus described as an Israelite without guile.', 'John 1:45-51; Matthew 10:3.'),
('Thomas',     'Didymus',  5, 72,       1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'Apostle known for his doubt and powerful confession of faith.', 'John 11:16; 14:5; 20:24-29.'),
('James son of Alphaeus', NULL, 5, 62,  1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'One of the twelve apostles; sometimes called James the Less.', 'Matthew 10:3; Mark 3:18.'),
('Thaddaeus',  'Judas son of James', 5, 65, 1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'Apostle also known as Judas son of James; asked Jesus a question at the Last Supper.', 'John 14:22; Matthew 10:3.'),
('Simon the Zealot', NULL, 5, 65,       1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'Apostle who may have been a member of the Zealot movement.', 'Matthew 10:4; Luke 6:15; Acts 1:13.'),
('Judas Iscariot', NULL,   3, 33,       1, 0, 'probable', 'apostle', 'minor', NULL, NULL, NULL, 'Apostle who betrayed Jesus for thirty pieces of silver.', 'Matthew 26:14-16, 47-50; 27:3-10; Acts 1:16-20.'),
('Matthias',   NULL,       5, 80,       1, 1, 'possible', 'apostle', 'minor', NULL, NULL, NULL, 'Chosen by lot to replace Judas Iscariot among the twelve.', 'Acts 1:21-26.'),
('Mark',       'John Mark', 15, 68,     1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Author of the Gospel of Mark; companion of Paul and Barnabas, later of Peter.', 'Acts 12:12, 25; 15:37-39; 2 Timothy 4:11; 1 Peter 5:13.'),
('Silas',      'Silvanus',  5, 65,      1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Prominent member of the Jerusalem church; companion of Paul on the second missionary journey.', 'Acts 15:22-40; 16-17; 1 Thessalonians 1:1.'),
('Titus',      NULL,        10, 70,     1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Gentile convert and co-worker of Paul; led the church in Crete.', 'Galatians 2:1-3; 2 Corinthians 7-8; Titus 1:4-5.'),
('Priscilla',  'Prisca',    10, 68,     1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Wife of Aquila; together they mentored Apollos and hosted house churches.', 'Acts 18:2-3, 18-26; Romans 16:3-5.'),
('Aquila',     NULL,        10, 68,     1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Husband of Priscilla; tentmaker who worked with Paul in Corinth.', 'Acts 18:2-3, 18-26; Romans 16:3-5.'),
('Apollos',    NULL,        10, 70,     1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Eloquent Alexandrian Jew who preached powerfully but was further taught by Priscilla and Aquila.', 'Acts 18:24-28; 1 Corinthians 1:12; 3:4-6.'),
('Philemon',   NULL,        10, 70,     1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Wealthy Christian in Colossae to whom Paul wrote about the slave Onesimus.', 'Philemon 1-25.'),
('James brother of Jesus', 'James the Just', -2, 62, 1, 1, 'probable', 'other', 'major', 'Judah', NULL, NULL, 'Half-brother of Jesus; leader of the Jerusalem church; author of the Epistle of James.', 'Acts 15:13-21; Galatians 1:19; 2:9; James 1:1. Josephus records his martyrdom ~AD 62.'),
('Herod the Great', NULL,  -73, -4, 0, 0, 'certain', 'king', 'minor', NULL, NULL, NULL, 'King of Judea who rebuilt the Temple but ordered the massacre of infants in Bethlehem.', 'Matthew 2:1-19; confirmed by Josephus. Death in 4 BC is well-established.'),
('Pontius Pilate', NULL,   -10, 39, 1, 1, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Roman governor of Judea who authorized the crucifixion of Jesus.', 'Matthew 27; Luke 23; John 18-19. Pilate Stone confirms his historicity.'),
('Anna',       'Anna the Prophetess', -95, NULL, 1, 1, 'possible', 'prophet', 'minor', 'Asher', NULL, NULL, 'Elderly prophetess who recognized the infant Jesus at the Temple.', 'Luke 2:36-38.');

-- ============================================================
-- GEN 5 & GEN 11 ANCESTORS (IDs 148-159) — Ussher Chronology
-- Complete genealogical chain from Adam to Abraham
-- ============================================================
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
-- Genesis 5 chain (between Seth and Enoch)
('Enosh',      'Enos',     -3769, -2864, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Seth; in his time people began to call on the name of the LORD.', 'Ussher: born 3769 BC (AM 235), died 2864 BC (905 years, Gen 5:6-11).'),
('Kenan',      'Cainan',   -3679, -2769, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Enosh; fourth generation from Adam.', 'Ussher: born 3679 BC (AM 325), died 2769 BC (910 years, Gen 5:9-14).'),
('Mahalalel',  NULL,       -3609, -2714, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Kenan; fifth generation from Adam.', 'Ussher: born 3609 BC (AM 395), died 2714 BC (895 years, Gen 5:12-17).'),
('Jared',      NULL,       -3544, -2582, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Mahalalel; father of Enoch. Lived 962 years, second-longest lifespan.', 'Ussher: born 3544 BC (AM 460), died 2582 BC (962 years, Gen 5:15-20).'),
-- Genesis 11 chain (between Shem and Abraham)
('Arphaxad',   'Arpachshad', -2346, -1908, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Shem; born two years after the Flood. Ancestor of Abraham.', 'Ussher: born 2346 BC (AM 1658), died 1908 BC (438 years, Gen 11:10-13).'),
('Salah',      'Shelah',   -2311, -1878, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Arphaxad; grandfather of Eber.', 'Ussher: born 2311 BC (AM 1693), died 1878 BC (433 years, Gen 11:12-15).'),
('Eber',       'Heber',    -2281, -1817, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Salah; ancestor of the Hebrews (the name "Hebrew" derives from Eber).', 'Ussher: born 2281 BC (AM 1723), died 1817 BC (464 years, Gen 11:14-17).'),
('Peleg',      NULL,       -2247, -2008, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Eber; in his days the earth was divided (Tower of Babel).', 'Ussher: born 2247 BC (AM 1757), died 2008 BC (239 years, Gen 11:16-19). Gen 10:25.'),
('Reu',        'Ragau',    -2217, -1978, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Peleg; continued the post-Flood patriarchal line.', 'Ussher: born 2217 BC (AM 1787), died 1978 BC (239 years, Gen 11:18-21).'),
('Serug',      'Saruch',   -2185, -1955, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Reu; grandfather of Terah.', 'Ussher: born 2185 BC (AM 1819), died 1955 BC (230 years, Gen 11:20-23).'),
('Nahor',      'Nahor son of Serug', -2155, -2007, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Serug; grandfather of Abraham. Not to be confused with Abraham''s brother Nahor.', 'Ussher: born 2155 BC (AM 1849), died 2007 BC (148 years, Gen 11:22-25).'),
('Terah',      NULL,       -2126, -1921, 0, 0, 'traditional', 'patriarch', 'minor', NULL, NULL, NULL, 'Son of Nahor; father of Abraham, Nahor, and Haran. Died in Haran.', 'Ussher: born 2126 BC (AM 1878), died 1921 BC (205 years, Gen 11:24-32). Abraham departed after Terah''s death (Acts 7:4).');

-- ============================================================
-- 100 ADDITIONAL PEOPLE (IDs 160-259)
-- ============================================================
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
-- Primeval (160-161)
('Cain',       NULL,       -3950, -3000, 1, 1, 'traditional', 'other', 'major', NULL, NULL, NULL, 'Firstborn son of Adam and Eve; murdered his brother Abel. Built the first city.', 'Ussher: born c. 3950 BC. Death unrecorded; Gen 4:1-16.'),
('Abel',       NULL,       -3948, -3880, 1, 1, 'traditional', 'other', 'major', NULL, NULL, NULL, 'Second son of Adam and Eve; shepherd whose offering pleased God. Murdered by Cain.', 'Ussher: born c. 3948 BC, killed by Cain c. 3880 BC (Gen 4:8). First death in Scripture.'),

-- Patriarchal era (162-179)
('Dinah',      NULL,       -1748, NULL, 1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Daughter of Jacob and Leah; incident at Shechem.', 'Gen 34; born c. 1748 BC.'),
('Simeon',     NULL,       -1753, -1620, 1, 1, 'traditional', 'patriarch', 'minor', 'Simeon', NULL, NULL, 'Second son of Jacob and Leah; ancestor of the tribe of Simeon.', 'Gen 29:33; 34:25; 42:24. Ussher: born c. 1753 BC.'),
('Levi',       NULL,       -1751, -1614, 1, 1, 'traditional', 'patriarch', 'minor', 'Levi', NULL, NULL, 'Third son of Jacob and Leah; ancestor of the priestly tribe. Lived 137 years.', 'Ussher: born c. 1751 BC, died c. 1614 BC (137 years, Exod 6:16).'),
('Dan',        NULL,       -1745, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Dan', NULL, NULL, 'Fifth son of Jacob; ancestor of the tribe of Dan.', 'Gen 30:6; 49:16-17.'),
('Naphtali',   NULL,       -1743, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Naphtali', NULL, NULL, 'Sixth son of Jacob; ancestor of the tribe of Naphtali.', 'Gen 30:8; 49:21.'),
('Gad',        NULL,       -1741, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Gad', NULL, NULL, 'Seventh son of Jacob; ancestor of the tribe of Gad.', 'Gen 30:11; 49:19.'),
('Asher',      NULL,       -1739, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Asher', NULL, NULL, 'Eighth son of Jacob; ancestor of the tribe of Asher.', 'Gen 30:13; 49:20.'),
('Issachar',   NULL,       -1737, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Issachar', NULL, NULL, 'Ninth son of Jacob; ancestor of the tribe of Issachar.', 'Gen 30:18; 49:14-15.'),
('Zebulun',    NULL,       -1735, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Zebulun', NULL, NULL, 'Tenth son of Jacob; ancestor of the tribe of Zebulun.', 'Gen 30:20; 49:13.'),
('Manasseh',   'Manasseh son of Joseph', -1715, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Manasseh', NULL, NULL, 'Firstborn son of Joseph; adopted by Jacob. Half-tribe of Israel.', 'Gen 41:51; 48:1-20.'),
('Ephraim',    NULL,       -1713, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Ephraim', NULL, NULL, 'Second son of Joseph; adopted by Jacob and given the firstborn blessing.', 'Gen 41:52; 48:1-20.'),
('Tamar',      'Tamar daughter-in-law of Judah', -1730, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', NULL, NULL, 'Daughter-in-law of Judah; mother of Perez and Zerah. In the lineage of David and Jesus.', 'Gen 38; Matt 1:3.'),
('Perez',      'Pharez',   -1725, NULL, 1, 1, 'traditional', 'patriarch', 'minor', 'Judah', NULL, NULL, 'Son of Judah and Tamar; ancestor of David and Jesus.', 'Gen 38:29; Ruth 4:18-22; Matt 1:3.'),
('Keturah',    NULL,       -1950, -1800, 1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Abraham''s wife after Sarah''s death; mother of six sons including Midian.', 'Gen 25:1-4. Ussher: married Abraham c. 1859 BC.'),
('Melchizedek',NULL,       -2000, NULL, 1, 1, 'traditional', 'priest', 'major', NULL, NULL, NULL, 'King of Salem and priest of God Most High; blessed Abraham. Type of Christ.', 'Gen 14:18-20; Ps 110:4; Heb 7. Ussher: c. 1913 BC.'),
('Potiphar',   NULL,       -1770, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Egyptian officer who bought Joseph as a slave; captain of Pharaoh''s guard.', 'Gen 39:1-20.'),
('Asenath',    NULL,       -1725, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Egyptian wife of Joseph; daughter of Potiphera priest of On. Mother of Manasseh and Ephraim.', 'Gen 41:45, 50-52.'),

-- Exodus/Wilderness (180-189)
('Korah',      NULL,       -1540, -1490, 1, 1, 'traditional', 'other', 'minor', 'Levi', NULL, NULL, 'Levite who led a rebellion against Moses and Aaron; swallowed by the earth.', 'Num 16:1-35. Ussher: c. 1490 BC.'),
('Balaam',     NULL,       -1530, -1451, 1, 1, 'traditional', 'prophet', 'minor', NULL, NULL, NULL, 'Pagan prophet hired by Balak to curse Israel; his donkey spoke. Killed by Israel.', 'Num 22-24; 31:8. Ussher: c. 1452 BC.'),
('Balak',      NULL,       -1510, NULL, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'King of Moab who hired Balaam to curse Israel.', 'Num 22-24.'),
('Rahab',      NULL,       -1475, -1400, 1, 1, 'traditional', 'other', 'major', NULL, NULL, NULL, 'Canaanite prostitute in Jericho who hid the Israelite spies; ancestor of David and Jesus.', 'Josh 2; 6:22-25; Matt 1:5; Heb 11:31. Ussher: c. 1451 BC.'),
('Achan',      NULL,       -1490, -1451, 1, 1, 'traditional', 'other', 'minor', 'Judah', NULL, NULL, 'Israelite who took forbidden plunder from Jericho; caused defeat at Ai.', 'Josh 7:1-26. Ussher: c. 1451 BC.'),
('Eleazar',    'Eleazar son of Aaron', -1530, -1415, 1, 1, 'traditional', 'priest', 'minor', 'Levi', NULL, NULL, 'Son of Aaron; succeeded him as high priest. Served during the conquest.', 'Exod 6:23; Num 20:28; Josh 24:33.'),
('Hur',        NULL,       -1550, -1460, 1, 1, 'traditional', 'other', 'minor', 'Judah', NULL, NULL, 'Held up Moses'' arms during the battle with Amalek alongside Aaron.', 'Exod 17:10-12; 24:14.'),
('Bezalel',    NULL,       -1520, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', NULL, NULL, 'Master craftsman filled with the Spirit of God; built the Tabernacle.', 'Exod 31:1-11; 35:30-35.'),
('Dathan',     NULL,       -1530, -1490, 1, 1, 'traditional', 'other', 'minor', 'Reuben', NULL, NULL, 'Reubenite who joined Korah''s rebellion against Moses; swallowed by the earth.', 'Num 16:1-35.'),
('Abiram',     NULL,       -1530, -1490, 1, 1, 'traditional', 'other', 'minor', 'Reuben', NULL, NULL, 'Reubenite who joined Korah''s rebellion against Moses; swallowed by the earth.', 'Num 16:1-35.'),

-- Judges/Pre-monarchy (190-199)
('Barak',      NULL,       -1250, -1200, 1, 1, 'possible', 'judge', 'minor', 'Naphtali', NULL, NULL, 'Military commander who fought alongside Deborah against Sisera.', 'Judg 4-5; Heb 11:32.'),
('Jael',       NULL,       -1250, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Kenite woman who killed Sisera by driving a tent peg through his temple.', 'Judg 4:17-22; 5:24-27.'),
('Sisera',     NULL,       -1270, -1245, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Canaanite general defeated by Deborah and Barak; killed by Jael.', 'Judg 4-5. Ussher: c. 1245 BC.'),
('Manoah',     NULL,       -1200, -1140, 1, 1, 'possible', 'other', 'minor', 'Dan', NULL, NULL, 'Father of Samson; visited by the Angel of the LORD.', 'Judg 13:1-25.'),
('Delilah',    NULL,       -1165, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Philistine woman who betrayed Samson by discovering the secret of his strength.', 'Judg 16:4-21.'),
('Tola',       NULL,       -1199, -1176, 1, 1, 'possible', 'judge', 'minor', 'Issachar', NULL, NULL, 'Judge of Israel for 23 years after Abimelech.', 'Judg 10:1-2. Ussher: c. 1199-1176 BC.'),
('Jair',       'Jair the Gileadite', -1176, -1154, 1, 1, 'possible', 'judge', 'minor', 'Manasseh', NULL, NULL, 'Judge of Israel for 22 years; had 30 sons who rode 30 donkeys.', 'Judg 10:3-5. Ussher: c. 1176-1154 BC.'),
('Ibzan',      NULL,       -1188, -1181, 1, 1, 'possible', 'judge', 'minor', NULL, NULL, NULL, 'Judge of Israel from Bethlehem for 7 years; had 30 sons and 30 daughters.', 'Judg 12:8-10. Ussher: c. 1188-1181 BC.'),
('Elon',       NULL,       -1181, -1171, 1, 1, 'possible', 'judge', 'minor', 'Zebulun', NULL, NULL, 'Judge of Israel for 10 years.', 'Judg 12:11-12. Ussher: c. 1181-1171 BC.'),
('Abdon',      NULL,       -1171, -1163, 1, 1, 'possible', 'judge', 'minor', 'Ephraim', NULL, NULL, 'Judge of Israel for 8 years; had 40 sons and 30 grandsons.', 'Judg 12:13-15. Ussher: c. 1171-1163 BC.'),

-- United Kingdom (200-209)
('Ish-bosheth','Esh-Baal', -1085, -1048, 1, 1, 'traditional', 'king', 'minor', 'Benjamin', NULL, NULL, 'Saul''s surviving son; made king over Israel by Abner while David reigned in Judah.', '2 Sam 2:8-10; 4:1-12.'),
('Abner',      NULL,       -1100, -1048, 1, 1, 'traditional', 'other', 'minor', 'Benjamin', NULL, NULL, 'Commander of Saul''s army; supported Ish-bosheth then defected to David. Killed by Joab.', '1 Sam 14:50; 2 Sam 2-3.'),
('Mephibosheth','Merib-Baal', -1054, -1000, 1, 1, 'traditional', 'other', 'minor', 'Benjamin', NULL, NULL, 'Son of Jonathan; lame in both feet. David showed him kindness for Jonathan''s sake.', '2 Sam 4:4; 9:1-13; 16:1-4; 19:24-30.'),
('Uriah',      'Uriah the Hittite', -1060, -1035, 1, 1, 'traditional', 'other', 'minor', NULL, NULL, NULL, 'Loyal soldier; husband of Bathsheba. Killed by David''s order to cover his sin.', '2 Sam 11:1-27; Matt 1:6.'),
('Hiram',      'Hiram of Tyre', -1050, -980, 1, 1, 'probable', 'king', 'minor', NULL, NULL, NULL, 'King of Tyre; ally of David and Solomon. Supplied materials for the Temple.', '2 Sam 5:11; 1 Kgs 5:1-18; 9:11-14.'),
('Adonijah',   NULL,       -1055, -1013, 1, 1, 'traditional', 'other', 'minor', 'Judah', NULL, NULL, 'David''s fourth son who tried to seize the throne; executed by Solomon.', '1 Kgs 1-2.'),
('Shimei',     'Shimei son of Gera', -1070, -1013, 1, 1, 'traditional', 'other', 'minor', 'Benjamin', NULL, NULL, 'Cursed David during Absalom''s rebellion; later executed by Solomon.', '2 Sam 16:5-13; 19:16-23; 1 Kgs 2:36-46.'),
('Hushai',     'Hushai the Archite', -1070, -1010, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'David''s friend who pretended to join Absalom and thwarted Ahithophel''s counsel.', '2 Sam 15:32-37; 16:16-17:16.'),
('Ahithophel', NULL,       -1080, -1023, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'David''s counselor who defected to Absalom; hanged himself when his advice was rejected.', '2 Sam 15:12, 31; 16:20-17:23.'),
('Zadok',      NULL,       -1090, -1000, 1, 1, 'traditional', 'priest', 'minor', 'Levi', NULL, NULL, 'Faithful priest who supported David and anointed Solomon. His line continued as high priests.', '2 Sam 15:24-29; 1 Kgs 1:32-45; Ezek 44:15.'),

-- Divided Kingdom (210-224)
('Widow of Zarephath', NULL, -935, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Poor widow who fed Elijah during the famine; her son was raised from death.', '1 Kgs 17:8-24; Luke 4:25-26.'),
('Gehazi',     NULL,       -870, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Servant of Elisha who was struck with leprosy for greed after Naaman''s healing.', '2 Kgs 4:12-37; 5:20-27; 8:4-5.'),
('Shunammite Woman', NULL, -870, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Wealthy woman who provided for Elisha; her son was raised from death by Elisha.', '2 Kgs 4:8-37; 8:1-6.'),
('Hazael',     NULL,       -895, -840, 1, 1, 'traditional', 'king', 'minor', NULL, NULL, NULL, 'King of Aram (Syria) anointed by Elisha; oppressed Israel during Jehu''s dynasty.', 'Ussher: became king c. 885 BC. Oppressed Israel during Jehoahaz (856-839 BC, 2 Kgs 13:3, 22). Died c. 840 BC.'),
('Sennacherib',NULL,       -745, -681, 0, 0, 'certain', 'king', 'minor', NULL, NULL, NULL, 'Assyrian king who besieged Jerusalem under Hezekiah; his army destroyed by the angel of the LORD.', '2 Kgs 18:13-19:37; Isa 36-37. Sennacherib''s Prism confirms campaign.'),
('Nebuchadnezzar', 'Nebuchadrezzar', -634, -562, 0, 0, 'certain', 'king', 'major', NULL, NULL, NULL, 'King of Babylon who destroyed Jerusalem and the Temple; had dreams interpreted by Daniel.', '2 Kgs 24-25; Dan 1-4. Ussher: reigned 605-562 BC.'),
('Belshazzar', NULL,       -575, -539, 0, 0, 'certain', 'king', 'minor', NULL, NULL, NULL, 'Last king of Babylon; saw the handwriting on the wall at his feast. Killed when Persia conquered Babylon.', 'Dan 5. Ussher: killed 539 BC.'),
('Cyrus',      'Cyrus the Great', -600, -530, 0, 0, 'certain', 'king', 'major', NULL, NULL, NULL, 'Persian king who conquered Babylon and issued the decree allowing Jews to return. Called God''s anointed.', 'Isa 44:28; 45:1; 2 Chr 36:22-23; Ezra 1:1-4.'),
('Darius',     'Darius the Mede', -600, -486, 1, 1, 'probable', 'king', 'minor', NULL, NULL, NULL, 'Median/Persian ruler who reluctantly put Daniel in the lions'' den.', 'Dan 5:31; 6:1-28; 9:1.'),
('Shadrach',   'Hananiah',  -620, -550, 1, 1, 'probable', 'other', 'minor', 'Judah', NULL, NULL, 'One of Daniel''s three companions who survived the fiery furnace.', 'Dan 1:6-7; 3:1-30.'),
('Meshach',    'Mishael',   -620, -550, 1, 1, 'probable', 'other', 'minor', 'Judah', NULL, NULL, 'One of Daniel''s three companions who survived the fiery furnace.', 'Dan 1:6-7; 3:1-30.'),
('Abednego',   'Azariah',   -620, -550, 1, 1, 'probable', 'other', 'minor', 'Judah', NULL, NULL, 'One of Daniel''s three companions who survived the fiery furnace.', 'Dan 1:6-7; 3:1-30.'),
('Nabal',      NULL,       -1060, -1020, 1, 1, 'possible', 'other', 'minor', 'Judah', NULL, NULL, 'Wealthy but foolish man married to Abigail; refused to help David. Died after the LORD struck him.', '1 Sam 25:2-42.'),
('Huldah',     NULL,       -660, -600, 1, 1, 'probable', 'prophet', 'minor', NULL, NULL, NULL, 'Prophetess in Jerusalem consulted by King Josiah about the Book of the Law found in the Temple.', '2 Kgs 22:14-20; 2 Chr 34:22-28. Ussher: c. 624 BC.'),
('Hilkiah',    NULL,       -670, -610, 1, 1, 'probable', 'priest', 'minor', 'Levi', NULL, NULL, 'High priest who found the Book of the Law in the Temple during Josiah''s reforms.', '2 Kgs 22:8-14; 2 Chr 34:14-21.'),

-- Post-Exile (225-229)
('Sanballat',  NULL,       -500, -430, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Governor of Samaria who opposed Nehemiah''s rebuilding of Jerusalem''s walls.', 'Neh 2:10, 19; 4:1-8; 6:1-14. Confirmed by Elephantine Papyri.'),
('Tobiah',     NULL,       -500, -430, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Ammonite official who opposed Nehemiah''s rebuilding and conspired against him.', 'Neh 2:10, 19; 4:3, 7; 6:1-14; 13:4-9.'),
('Haman',      NULL,       -510, -473, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Persian official who plotted the genocide of the Jewish people; hanged on his own gallows.', 'Esth 3-7. Ussher: c. 473 BC.'),
('Vashti',     NULL,       -520, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Queen of Persia before Esther; deposed for refusing to appear before the king.', 'Esth 1:1-22.'),
('Xerxes',     'Ahasuerus', -519, -465, 0, 0, 'certain', 'king', 'minor', NULL, NULL, NULL, 'Persian king who married Esther; issued decree saving the Jews from Haman''s plot.', 'Esth 1-10. Identified with Xerxes I. Ussher: reigned 486-465 BC.'),

-- New Testament — Life of Christ era (230-244)
('Simeon',     'Simeon at the Temple', -100, -2, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Devout man in Jerusalem who held the infant Jesus and prophesied. Promised he would see the Messiah.', 'Luke 2:25-35.'),
('Zechariah',  'Zechariah father of John', -60, -5, 1, 1, 'possible', 'priest', 'minor', 'Levi', NULL, NULL, 'Priest who was struck mute for doubting Gabriel''s announcement of John the Baptist''s birth.', 'Luke 1:5-25, 57-80.'),
('Elizabeth',  NULL,       -55, -3, 1, 1, 'possible', 'other', 'minor', 'Levi', NULL, NULL, 'Wife of Zechariah; mother of John the Baptist. Relative of Mary.', 'Luke 1:5-7, 39-45, 57-60.'),
('Herod Antipas','Herod the Tetrarch', -20, 39, 0, 0, 'certain', 'king', 'minor', NULL, NULL, NULL, 'Son of Herod the Great; executed John the Baptist and mocked Jesus during his trial.', 'Matt 14:1-12; Luke 23:6-12; Mark 6:14-29.'),
('Herodias',   NULL,       -15, 39, 1, 1, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Wife of Herod Antipas; orchestrated John the Baptist''s execution through her daughter.', 'Matt 14:3-11; Mark 6:17-28.'),
('Salome daughter of Herodias', NULL, -5, 50, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Daughter of Herodias who danced before Herod and requested John the Baptist''s head.', 'Matt 14:6-11; Mark 6:22-28. Named by Josephus.'),
('Caiaphas',   'Joseph Caiaphas', -30, 36, 1, 1, 'probable', 'priest', 'minor', NULL, NULL, NULL, 'High priest who presided over Jesus'' trial; declared it expedient for one man to die for the people.', 'Matt 26:3, 57-68; John 11:49-53; 18:13-28. Ossuary discovered 1990.'),
('Annas',      NULL,       -25, 40, 1, 1, 'probable', 'priest', 'minor', NULL, NULL, NULL, 'Former high priest and father-in-law of Caiaphas; influential in Jesus'' trial.', 'Luke 3:2; John 18:13-24; Acts 4:6.'),
('Barabbas',   NULL,       -5, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Criminal released by Pilate instead of Jesus at the crowd''s demand.', 'Matt 27:15-26; Mark 15:6-15; Luke 23:18-25; John 18:39-40.'),
('Joseph of Arimathea', NULL, -30, 50, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Rich member of the Sanhedrin who provided his tomb for Jesus'' burial.', 'Matt 27:57-60; Mark 15:42-46; Luke 23:50-53; John 19:38-42.'),
('Simon of Cyrene', NULL, -10, 50, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Man from Cyrene compelled to carry Jesus'' cross.', 'Matt 27:32; Mark 15:21; Luke 23:26.'),
('Zacchaeus',  NULL,       -20, 50, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Chief tax collector in Jericho who climbed a sycamore tree to see Jesus; converted.', 'Luke 19:1-10.'),
('Jairus',     NULL,       -20, NULL, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Synagogue ruler whose 12-year-old daughter Jesus raised from the dead.', 'Mark 5:22-43; Luke 8:41-56.'),
('Cleopas',    NULL,       -5, 70, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Disciple who encountered the risen Jesus on the road to Emmaus.', 'Luke 24:13-35.'),
('Mary of Bethany', NULL,  -10, 60, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Sister of Martha and Lazarus; sat at Jesus'' feet; anointed him with expensive perfume.', 'Luke 10:38-42; John 11:1-2; 12:1-8.'),

-- Apostolic Age (245-259)
('Ananias of Damascus', NULL, 5, 60, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Disciple in Damascus who baptized Paul after his conversion on the road to Damascus.', 'Acts 9:10-19; 22:12-16.'),
('Cornelius',  NULL,       -5, 60, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Roman centurion in Caesarea; first Gentile convert. His household received the Holy Spirit.', 'Acts 10:1-48; 11:1-18.'),
('Lydia',      NULL,       10, 65, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Seller of purple cloth in Philippi; first European convert. Hosted Paul and Silas.', 'Acts 16:14-15, 40.'),
('Gamaliel',   NULL,       -10, 52, 1, 1, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Respected Pharisee and teacher of Paul; counseled moderation toward the apostles.', 'Acts 5:34-39; 22:3.'),
('Agabus',     NULL,       5, 65, 1, 1, 'possible', 'prophet', 'minor', NULL, NULL, NULL, 'Christian prophet who predicted a famine and later warned Paul of his arrest in Jerusalem.', 'Acts 11:27-28; 21:10-11.'),
('Dorcas',     'Tabitha',  5, 41, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Disciple in Joppa known for charitable works; raised from the dead by Peter.', 'Acts 9:36-43.'),
('Philip the Evangelist', NULL, 5, 70, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'One of the Seven; evangelized Samaria and baptized the Ethiopian eunuch on the Gaza road.', 'Acts 6:5; 8:4-40; 21:8-9.'),
('Ethiopian Eunuch', NULL, -5, 60, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Official of the Ethiopian queen Candace; baptized by Philip after reading Isaiah.', 'Acts 8:26-39.'),
('Onesimus',   NULL,       30, 80, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Runaway slave of Philemon whom Paul sent back with a letter urging his freedom.', 'Philem 1:10-21; Col 4:9.'),
('Rhoda',      NULL,       15, 70, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Servant girl who answered the door when Peter was freed from prison; was so overjoyed she forgot to open it.', 'Acts 12:13-16.'),
('Herod Agrippa I', NULL,  -10, 44, 0, 0, 'certain', 'king', 'minor', NULL, NULL, NULL, 'Grandson of Herod the Great; executed James son of Zebedee and imprisoned Peter. Struck dead by God.', 'Acts 12:1-23. Confirmed by Josephus.'),
('Herod Agrippa II', NULL, 27, 100, 0, 0, 'certain', 'king', 'minor', NULL, NULL, NULL, 'Last of the Herodian line; heard Paul''s defense at Caesarea. Said Paul almost persuaded him to be a Christian.', 'Acts 25:13-26:32.'),
('Felix',      'Antonius Felix', 5, 59, 1, 1, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Roman governor of Judea who heard Paul''s case and left him imprisoned for two years.', 'Acts 23:24-24:27.'),
('Festus',     'Porcius Festus', 10, 62, 1, 1, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Roman governor who succeeded Felix; before whom Paul appealed to Caesar.', 'Acts 25:1-12; 26:24-32.'),
('Ananias and Sapphira', NULL, -5, 34, 1, 0, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Husband and wife who lied to the Holy Spirit about the price of their property; both struck dead.', 'Acts 5:1-11.'),
('Phoebe',     NULL,       20, 70, 1, 1, 'possible', 'other', 'minor', NULL, NULL, NULL, 'Deaconess of the church at Cenchreae; commended by Paul as a patron and letter-carrier of Romans.', 'Rom 16:1-2.');

-- ============================================================
-- DAVID'S LINEAGE CHAIN (IDs 260-266)
-- Ruth 4:18-22; Matt 1:3-6; 1 Chr 2:5-16
-- ============================================================
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
('Hezron',     NULL,       -1700, -1570, 1, 1, 'traditional', 'patriarch', 'minor', 'Judah', NULL, NULL, 'Son of Perez; grandson of Judah. Went down to Egypt with Jacob. Ancestor of David and Jesus.', 'Gen 46:12; Ruth 4:18; 1 Chr 2:5. Ussher: born c. 1700 BC.'),
('Ram',        NULL,       -1670, -1540, 1, 1, 'traditional', 'patriarch', 'minor', 'Judah', NULL, NULL, 'Son of Hezron; ancestor of David. Mentioned in Ruth''s genealogy and Matthew''s genealogy of Jesus.', 'Ruth 4:19; 1 Chr 2:9-10; Matt 1:3-4.'),
('Amminadab',  NULL,       -1640, -1510, 1, 1, 'traditional', 'patriarch', 'minor', 'Judah', NULL, NULL, 'Son of Ram; father of Nahshon. His daughter Elisheba married Aaron. Ancestor of David and Jesus.', 'Ruth 4:19-20; Exod 6:23; 1 Chr 2:10; Matt 1:4.'),
('Nahshon',    NULL,       -1610, -1451, 1, 1, 'traditional', 'leader', 'minor', 'Judah', NULL, NULL, 'Son of Amminadab; leader of the tribe of Judah during the Exodus. Brother-in-law of Aaron. Ancestor of David.', 'Num 1:7; 2:3; 7:12-17; Ruth 4:20; Matt 1:4.'),
('Salmon',     'Sala',     -1470, -1370, 1, 1, 'traditional', 'patriarch', 'minor', 'Judah', NULL, NULL, 'Son of Nahshon; husband of Rahab according to Matthew. Father of Boaz. Ancestor of David and Jesus.', 'Ruth 4:20-21; Matt 1:4-5; 1 Chr 2:11.'),
('Obed',       NULL,       -1190, -1100, 1, 1, 'possible', 'patriarch', 'minor', 'Judah', NULL, NULL, 'Son of Boaz and Ruth; father of Jesse, grandfather of David. Central link in the Messianic lineage.', 'Ruth 4:13-17, 21-22; 1 Chr 2:12; Matt 1:5.'),
('Jesse',      'Yishai',   -1140, -1060, 1, 1, 'traditional', 'other', 'major', 'Judah', NULL, NULL, 'Son of Obed; father of David and seven other sons. From Bethlehem. Called "Jesse the Bethlehemite."', '1 Sam 16:1-13; 17:12-14; Ruth 4:22; Isa 11:1, 10; Matt 1:5-6.'),
-- Kings of Judah gap-fillers
('Ahaziah of Judah', 'Jehoahaz', -907, -884, 0, 0, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Son of Jehoram and Athaliah; king of Judah for one year. Killed by Jehu.', 'Ussher: reigned 885-884 BC (1 year, 2 Kgs 8:25-26). Age 22 at accession: born 907 BC. Killed by Jehu (2 Kgs 9:27-28).'),
('Amon',       NULL,       -664, -640, 0, 0, 'traditional', 'king', 'minor', 'Judah', NULL, NULL, 'Son of Manasseh; evil king of Judah for 2 years. Assassinated by his servants.', 'Ussher: reigned 642-640 BC (2 years, 2 Kgs 21:19). Age 22 at accession: born 664 BC.'),
('Jehoiachin', 'Jeconiah,Coniah', -616, -560, 1, 1, 'certain', 'king', 'minor', 'Judah', NULL, NULL, 'Son of Jehoiakim; king of Judah for 3 months. Deported to Babylon; later released by Evil-Merodach. In the lineage of Jesus.', '2 Kgs 24:8-16; 25:27-30; Jer 22:24-30; Matt 1:11-12. Ussher: reigned 598-597 BC.');

-- ============================================================
-- GENEALOGY LINKS (father_id, mother_id) for existing people
-- ============================================================
UPDATE people SET father_id = 1, mother_id = 2 WHERE id = 49;  -- Seth → Adam & Eve
-- Gen 5 chain: Seth → Enosh → Kenan → Mahalalel → Jared → Enoch → Methuselah → Lamech → Noah
UPDATE people SET father_id = 49  WHERE id = 148;               -- Enosh → Seth
UPDATE people SET father_id = 148 WHERE id = 149;               -- Kenan → Enosh
UPDATE people SET father_id = 149 WHERE id = 150;               -- Mahalalel → Kenan
UPDATE people SET father_id = 150 WHERE id = 151;               -- Jared → Mahalalel
UPDATE people SET father_id = 151 WHERE id = 50;                -- Enoch → Jared
UPDATE people SET father_id = 50  WHERE id = 51;                -- Methuselah → Enoch
UPDATE people SET father_id = 51  WHERE id = 52;                -- Lamech → Methuselah
UPDATE people SET father_id = 52  WHERE id = 3;                 -- Noah → Lamech
UPDATE people SET father_id = 3   WHERE id = 53;                -- Shem → Noah
UPDATE people SET father_id = 3   WHERE id = 54;                -- Ham → Noah
UPDATE people SET father_id = 3   WHERE id = 55;                -- Japheth → Noah
-- Gen 11 chain: Shem → Arphaxad → Salah → Eber → Peleg → Reu → Serug → Nahor → Terah → Abraham
UPDATE people SET father_id = 53  WHERE id = 152;               -- Arphaxad → Shem
UPDATE people SET father_id = 152 WHERE id = 153;               -- Salah → Arphaxad
UPDATE people SET father_id = 153 WHERE id = 154;               -- Eber → Salah
UPDATE people SET father_id = 154 WHERE id = 155;               -- Peleg → Eber
UPDATE people SET father_id = 155 WHERE id = 156;               -- Reu → Peleg
UPDATE people SET father_id = 156 WHERE id = 157;               -- Serug → Reu
UPDATE people SET father_id = 157 WHERE id = 158;               -- Nahor → Serug
UPDATE people SET father_id = 158 WHERE id = 159;               -- Terah → Nahor
UPDATE people SET father_id = 159 WHERE id = 4;                 -- Abraham → Terah
UPDATE people SET father_id = 4, mother_id = 5 WHERE id = 6;   -- Isaac → Abraham & Sarah
UPDATE people SET father_id = 4, mother_id = 58 WHERE id = 57; -- Ishmael → Abraham & Hagar
UPDATE people SET father_id = 60 WHERE id = 7;                  -- Rebekah → Laban's father (set Laban as brother, not father)
UPDATE people SET father_id = 6, mother_id = 7 WHERE id = 8;   -- Jacob → Isaac & Rebekah
UPDATE people SET father_id = 6, mother_id = 7 WHERE id = 59;  -- Esau → Isaac & Rebekah
UPDATE people SET father_id = 60 WHERE id = 61;                 -- Leah → Laban
UPDATE people SET father_id = 60 WHERE id = 62;                 -- Rachel → Laban
UPDATE people SET father_id = 8, mother_id = 62 WHERE id = 9;  -- Joseph → Jacob & Rachel
UPDATE people SET father_id = 8, mother_id = 61 WHERE id = 63; -- Judah → Jacob & Leah
UPDATE people SET father_id = 8, mother_id = 62 WHERE id = 64; -- Benjamin → Jacob & Rachel
UPDATE people SET father_id = 8, mother_id = 61 WHERE id = 65; -- Reuben → Jacob & Leah
UPDATE people SET father_id = 69 WHERE id = 70;                 -- Zipporah → Jethro
UPDATE people SET father_id = 15 WHERE id = 78;                 -- Abimelech → Gideon
UPDATE people SET father_id = 19 WHERE id = 83;                 -- Jonathan → Saul
UPDATE people SET father_id = 19 WHERE id = 84;                 -- Michal → Saul
UPDATE people SET father_id = 20 WHERE id = 82;                 -- Absalom → David
UPDATE people SET father_id = 20, mother_id = 80 WHERE id = 21; -- Solomon → David & Bathsheba
UPDATE people SET father_id = 21 WHERE id = 85;                 -- Rehoboam → Solomon
UPDATE people SET father_id = 85 WHERE id = 86;                 -- Asa → Rehoboam (via Abijah)
UPDATE people SET father_id = 86 WHERE id = 87;                 -- Jehoshaphat → Asa
UPDATE people SET father_id = 87 WHERE id = 88;                 -- Jehoram of Judah → Jehoshaphat
UPDATE people SET father_id = 90 WHERE id = 29;                 -- Hezekiah → Ahaz
UPDATE people SET father_id = 29 WHERE id = 91;                 -- Manasseh → Hezekiah
UPDATE people SET father_id = 30 WHERE id = 92;                 -- Jehoiakim → Josiah
UPDATE people SET father_id = 30 WHERE id = 93;                 -- Zedekiah → Josiah
UPDATE people SET father_id = 95 WHERE id = 96;                 -- Amaziah → Joash of Judah
UPDATE people SET father_id = 96 WHERE id = 89;                 -- Uzziah → Amaziah
UPDATE people SET father_id = 89 WHERE id = 97;                 -- Jotham → Uzziah
UPDATE people SET father_id = 97 WHERE id = 90;                 -- Ahaz → Jotham
UPDATE people SET father_id = 31 WHERE id = 98;                 -- Nadab → Jeroboam I
UPDATE people SET father_id = 100 WHERE id = 32;                -- Ahab → Omri
UPDATE people SET father_id = 32, mother_id = 107 WHERE id = 101; -- Ahaziah of Israel → Ahab & Jezebel
UPDATE people SET father_id = 32, mother_id = 107 WHERE id = 102; -- Jehoram of Israel → Ahab & Jezebel
UPDATE people SET mother_id = 75 WHERE id = 18;                 -- Samuel → Hannah (mother)
UPDATE people SET father_id = 122, mother_id = 38 WHERE id = 37; -- Jesus → Joseph of Nazareth & Mary
UPDATE people SET father_id = 122, mother_id = 38 WHERE id = 144; -- James brother of Jesus → Joseph & Mary

-- 100 ADDITIONAL PEOPLE — genealogy links
UPDATE people SET father_id = 1, mother_id = 2 WHERE id = 160;  -- Cain → Adam & Eve
UPDATE people SET father_id = 1, mother_id = 2 WHERE id = 161;  -- Abel → Adam & Eve
UPDATE people SET father_id = 8, mother_id = 61 WHERE id = 162; -- Dinah → Jacob & Leah
UPDATE people SET father_id = 8, mother_id = 61 WHERE id = 163; -- Simeon → Jacob & Leah
UPDATE people SET father_id = 8, mother_id = 61 WHERE id = 164; -- Levi → Jacob & Leah
UPDATE people SET father_id = 8 WHERE id = 165;                 -- Dan → Jacob
UPDATE people SET father_id = 8 WHERE id = 166;                 -- Naphtali → Jacob
UPDATE people SET father_id = 8 WHERE id = 167;                 -- Gad → Jacob
UPDATE people SET father_id = 8 WHERE id = 168;                 -- Asher → Jacob
UPDATE people SET father_id = 8, mother_id = 61 WHERE id = 169; -- Issachar → Jacob & Leah
UPDATE people SET father_id = 8, mother_id = 61 WHERE id = 170; -- Zebulun → Jacob & Leah
UPDATE people SET father_id = 9, mother_id = 178 WHERE id = 171; -- Manasseh → Joseph & Asenath
UPDATE people SET father_id = 9, mother_id = 178 WHERE id = 172; -- Ephraim → Joseph & Asenath
UPDATE people SET father_id = 63, mother_id = 173 WHERE id = 174; -- Perez → Judah & Tamar
-- David's lineage chain: Perez → Hezron → Ram → Amminadab → Nahshon → Salmon → Boaz → Obed → Jesse → David
UPDATE people SET father_id = 174 WHERE id = 260;               -- Hezron → Perez
UPDATE people SET father_id = 260 WHERE id = 261;               -- Ram → Hezron
UPDATE people SET father_id = 261 WHERE id = 262;               -- Amminadab → Ram
UPDATE people SET father_id = 262 WHERE id = 263;               -- Nahshon → Amminadab
UPDATE people SET father_id = 263 WHERE id = 264;               -- Salmon → Nahshon
UPDATE people SET father_id = 264, mother_id = 182 WHERE id = 76;  -- Boaz → Salmon & Rahab (Matt 1:5)
UPDATE people SET father_id = 76, mother_id = 17 WHERE id = 265;   -- Obed → Boaz & Ruth
UPDATE people SET father_id = 265 WHERE id = 266;               -- Jesse → Obed
UPDATE people SET father_id = 266 WHERE id = 20;                -- David → Jesse
-- Kings of Judah full chain (completion)
UPDATE people SET father_id = 88, mother_id = 94 WHERE id = 267; -- Ahaziah of Judah → Jehoram & Athaliah
UPDATE people SET father_id = 267 WHERE id = 95;                -- Joash of Judah → Ahaziah of Judah
UPDATE people SET father_id = 91 WHERE id = 268;                -- Amon → Manasseh
UPDATE people SET father_id = 268 WHERE id = 30;                -- Josiah → Amon
UPDATE people SET father_id = 92 WHERE id = 269;                -- Jehoiachin → Jehoiakim
UPDATE people SET father_id = 11 WHERE id = 184;                -- Eleazar → Aaron
UPDATE people SET father_id = 184 WHERE id = 68;                -- Phinehas → Eleazar
UPDATE people SET father_id = 192 WHERE id = 16;                -- Samson → Manoah
UPDATE people SET father_id = 19 WHERE id = 199;                -- Ish-bosheth → Saul
UPDATE people SET father_id = 83 WHERE id = 201;                -- Mephibosheth → Jonathan
UPDATE people SET father_id = 20 WHERE id = 204;                -- Adonijah → David
UPDATE people SET father_id = 145 WHERE id = 232;               -- Herod Antipas → Herod the Great
UPDATE people SET father_id = 230, mother_id = 231 WHERE id = 39; -- John the Baptist → Zechariah & Elizabeth

-- ============================================================
-- LIFESPAN CORRECTIONS — Ussher & Biblical/Traditional Sources
-- Filling in NULL birth/death dates where data exists
-- ============================================================

-- Rebekah: buried at Machpelah (Gen 49:31); died before Jacob returned from Haran c. 1739 BC
UPDATE people SET death_year = -1739, date_notes = 'Ussher: born c. 1890 BC. Died before Jacob returned; buried at Machpelah (Gen 49:31).' WHERE id = 7;

-- Ham: Scripture does not record lifespan; post-Flood patriarchs lived ~400-600 yrs
UPDATE people SET death_year = -1948, date_notes = 'Ussher: born c. 2448 BC (Gen 5:32). Death unrecorded; estimated ~500 year lifespan per post-Flood pattern.' WHERE id = 54;

-- Japheth: same situation as Ham
UPDATE people SET death_year = -1948, date_notes = 'Ussher: born c. 2448 BC (Gen 10:21 implies eldest). Death unrecorded; estimated ~500 year lifespan per post-Flood pattern.' WHERE id = 55;

-- Lot: fled Sodom c. 1897 BC (Ussher); lived in cave after; likely died c. 1870 BC
UPDATE people SET death_year = -1870, date_notes = 'Ussher: born c. 1960 BC. Sodom destroyed c. 1897 BC (Gen 19). Death unrecorded; estimated c. 1870 BC.' WHERE id = 56;

-- Esau: Genesis 35:29 records Isaac''s burial by Esau and Jacob (1716 BC); Jubilees 38 places death at age 147-148; conservative estimate ~1689 BC (same as Jacob)
UPDATE people SET death_year = -1689, date_notes = 'Ussher: born 1836 BC (twin of Jacob, Gen 25:26). Death unrecorded in canon; estimated as contemporary with Jacob (d. 1689 BC).' WHERE id = 59;

-- Laban: contemporary of Jacob; roughly generation older
UPDATE people SET death_year = -1750, date_notes = 'Ussher: born c. 1920 BC. Death unrecorded; estimated c. 1750 BC based on patriarchal era lifespans.' WHERE id = 60;

-- Leah: buried at Machpelah (Gen 49:31); died before Jacob went to Egypt (1706 BC)
UPDATE people SET death_year = -1710, date_notes = 'Ussher: born c. 1850 BC. Buried at Machpelah (Gen 49:31); died before Jacob went to Egypt c. 1706 BC.' WHERE id = 61;

-- Judah: entered Egypt with Jacob c. 1706 BC; died in Egypt
UPDATE people SET death_year = -1620, date_notes = 'Ussher: born c. 1750 BC. Entered Egypt c. 1706 BC (Gen 46:12). Death unrecorded; estimated ~130 years per patriarchal pattern.' WHERE id = 63;

-- Benjamin: youngest son; entered Egypt with Jacob
UPDATE people SET death_year = -1600, date_notes = 'Ussher: born c. 1730 BC (Gen 35:16-20). Entered Egypt c. 1706 BC. Death unrecorded; estimated ~130 years.' WHERE id = 64;

-- Reuben: firstborn of Jacob
UPDATE people SET death_year = -1625, date_notes = 'Ussher: born c. 1755 BC. Entered Egypt c. 1706 BC (Gen 46:8-9). Death unrecorded; estimated ~130 years.' WHERE id = 65;

-- Pharaoh of Exodus: drowned in Red Sea (Exod 14:28; Ps 136:15)
UPDATE people SET death_year = -1491, date_notes = 'Ussher: Exodus 1491 BC. Perished at the Red Sea (Exod 14:28; Ps 136:15). Identity debated.' WHERE id = 66;

-- Phinehas: served through conquest; Ussher places him active through early Judges
UPDATE people SET death_year = -1380, date_notes = 'Ussher: born c. 1465 BC. Served through Conquest period; active in Josh 22:13. Death unrecorded; est. c. 1380 BC.' WHERE id = 68;

-- Jethro: elderly when Moses fled to Midian; likely died before Exodus
UPDATE people SET death_year = -1500, date_notes = 'Ussher: born c. 1605 BC. Death unrecorded; likely died before or during Exodus era.' WHERE id = 69;

-- Zipporah: wife of Moses; alive during Exodus (Exod 18:2)
UPDATE people SET death_year = -1460, date_notes = 'Ussher: born c. 1555 BC. Rejoined Moses at Sinai (Exod 18:2-5). Death unrecorded; est. c. 1460 BC.' WHERE id = 70;

-- Deborah: judged Israel 40 years (Judg 5:31); Ussher c. 1245-1205 BC
UPDATE people SET death_year = -1195, date_notes = 'Ussher: c. 1245 BC. Land had rest 40 years (Judg 5:31); est. death c. 1195 BC.' WHERE id = 14;

-- Gideon: judged 40 years; died in good old age (Judg 8:28, 32)
UPDATE people SET death_year = -1195, date_notes = 'Ussher: c. 1235 BC. Judged 40 years (Judg 8:28); died in good old age (Judg 8:32); est. death c. 1195 BC.' WHERE id = 15;

-- Ruth: married Boaz c. 1195 BC; bore Obed, grandfather of David (b. 1085 BC)
UPDATE people SET death_year = -1100, date_notes = 'Ussher: born c. 1195 BC. Married Boaz (Ruth 4); great-grandmother of David. Death unrecorded; est. c. 1100 BC.' WHERE id = 17;

-- Ehud: judged 80 years rest (Judg 3:30)
UPDATE people SET death_year = -1275, date_notes = 'Ussher: born c. 1355 BC. Land had rest 80 years (Judg 3:30); est. death c. 1275 BC.' WHERE id = 72;

-- Hannah: mother of Samuel; dedicated him at Shiloh
UPDATE people SET death_year = -1100, date_notes = 'Ussher: born c. 1175 BC (1 Sam 1-2). Death unrecorded; est. c. 1100 BC.' WHERE id = 75;

-- Boaz: kinsman-redeemer; grandfather of Jesse
UPDATE people SET death_year = -1120, date_notes = 'Ussher: born c. 1205 BC (Ruth 2-4). Death unrecorded; est. c. 1120 BC based on David''s genealogy.' WHERE id = 76;

-- Naomi: returned from Moab c. 1195 BC
UPDATE people SET death_year = -1140, date_notes = 'Ussher: born c. 1225 BC (Ruth 1-4). Death unrecorded; est. c. 1140 BC.' WHERE id = 77;

-- Abigail: married David c. 1058 BC (1 Sam 25)
UPDATE people SET death_year = -1010, date_notes = 'Ussher: born c. 1075 BC (1 Sam 25). Death unrecorded; est. c. 1010 BC.' WHERE id = 79;

-- Bathsheba: alive into Solomon''s reign (1 Kgs 2:19)
UPDATE people SET death_year = -1000, date_notes = 'Ussher: born c. 1065 BC. Alive early in Solomon''s reign (1 Kgs 2:19). Death unrecorded; est. c. 1000 BC.' WHERE id = 80;

-- Michal: childless (2 Sam 6:23); disappears from narrative
UPDATE people SET death_year = -1030, date_notes = 'Ussher: born c. 1095 BC. Childless (2 Sam 6:23). Death unrecorded; est. c. 1030 BC.' WHERE id = 84;

-- Naaman: healed during Elisha's ministry c. 870-825 BC per Ussher (2 Kgs 5)
UPDATE people SET death_year = -800, date_notes = 'Ussher: healed during Elisha''s ministry c. 870-825 BC (2 Kgs 5). Death unrecorded; est. c. 800 BC.' WHERE id = 48;

-- Job: lived 140 years after trials (Job 42:16); Ussher places in patriarchal era
UPDATE people SET death_year = -1800, date_notes = 'Ussher: patriarchal era, c. 2000 BC. Lived 140 years after trials (Job 42:16). Total lifespan est. ~200 years; death c. 1800 BC.' WHERE id = 121;

-- Joel: prophesied c. 835 BC; date heavily debated
UPDATE people SET death_year = -796, date_notes = 'Ussher: c. 835 BC. Date heavily debated (Joel 1-3). Est. death c. 796 BC.' WHERE id = 109;

-- Amos: prophesied during Uzziah (810-758 BC) and Jeroboam II (825-784 BC) per Ussher
UPDATE people SET death_year = -740, date_notes = 'Ussher: prophesied during Uzziah (810-758 BC) and Jeroboam II (825-784 BC). Amos 1:1. Death unrecorded; est. c. 740 BC.' WHERE id = 110;

-- Obadiah: prophesied after fall of Jerusalem 586 BC
UPDATE people SET death_year = -550, date_notes = 'Ussher: c. 586 BC (Obad 1). Death unrecorded; est. c. 550 BC.' WHERE id = 111;

-- Jonah: prophesied during Jeroboam II (825-784 BC per Ussher); 2 Kgs 14:25
UPDATE people SET death_year = -750, date_notes = 'Ussher: prophesied during Jeroboam II (825-784 BC per Ussher, 2 Kgs 14:25; Jonah 1-4). Death unrecorded; est. c. 750 BC.' WHERE id = 112;

-- Nahum: prophesied before Nineveh''s fall (612 BC)
UPDATE people SET death_year = -615, date_notes = 'Ussher: c. 660 BC. Prophesied before fall of Nineveh 612 BC (Nah 1-3). Est. death c. 615 BC.' WHERE id = 114;

-- Habakkuk: contemporary of Jeremiah; c. 608-605 BC
UPDATE people SET death_year = -580, date_notes = 'Ussher: c. 620 BC. Contemporary of Jeremiah (Hab 1-3). Est. death c. 580 BC.' WHERE id = 115;

-- Zephaniah: prophesied during Josiah (Zeph 1:1); c. 630-620 BC
UPDATE people SET death_year = -600, date_notes = 'Ussher: c. 640 BC. Prophesied during Josiah''s reign (Zeph 1:1). Est. death c. 600 BC.' WHERE id = 116;

-- Haggai: prophesied 520 BC (Hag 1:1); likely elderly
UPDATE people SET death_year = -500, date_notes = 'Ussher: prophesied 520 BC (Hag 1:1). Likely elderly; est. death c. 500 BC.' WHERE id = 117;

-- Zechariah (prophet): prophesied 520-518 BC (Zech 1:1; 7:1)
UPDATE people SET death_year = -480, date_notes = 'Ussher: prophesied 520-518 BC (Zech 1:1; 7:1). Est. death c. 480 BC.' WHERE id = 118;

-- Malachi: last OT prophet c. 430 BC
UPDATE people SET death_year = -400, date_notes = 'Ussher: c. 460 BC. Last OT prophet (Mal 1-4). Est. death c. 400 BC.' WHERE id = 119;

-- Anna: 84 years old at Jesus'' presentation (Luke 2:36-37); c. 5 BC
UPDATE people SET death_year = -3, date_notes = 'Ussher: born c. 95 BC. Aged 84 at Jesus'' Temple presentation c. 5 BC (Luke 2:36-37). Est. death c. 3 BC.' WHERE id = 147;

-- Stephen: born c. AD 5 (est.); martyred c. AD 35
UPDATE people SET birth_year = 5, date_notes = 'Born c. AD 5 (estimated). First Christian martyr c. AD 35 (Acts 7:54-60).' WHERE id = 45;

-- Barnabas: born c. 10 BC (est.); from Cyprus (Acts 4:36)
UPDATE people SET birth_year = -10, date_notes = 'Born c. 10 BC (estimated). Levite from Cyprus (Acts 4:36). Martyrdom c. AD 61 per tradition.' WHERE id = 46;

-- Luke: born c. AD 5 (est.); physician (Col 4:14)
UPDATE people SET birth_year = 5, date_notes = 'Born c. AD 5 (estimated). Physician (Col 4:14); author of Luke-Acts. Died c. AD 84 per tradition.' WHERE id = 47;

-- Martha: died c. AD 60 (est. contemporary with Lazarus)
UPDATE people SET death_year = 60, date_notes = 'Born c. 10 BC (estimated). Sister of Lazarus (John 11). Death unrecorded; est. c. AD 60.' WHERE id = 125;

-- Mary Magdalene: tradition places death c. AD 60-70
UPDATE people SET death_year = 63, date_notes = 'Born c. 5 BC (estimated). First resurrection witness (John 20:18). Death unrecorded; tradition est. c. AD 63.' WHERE id = 126;

-- Nicodemus: Pharisee; helped bury Jesus (John 19:39); tradition places death c. AD 50-60
UPDATE people SET death_year = 55, date_notes = 'Born c. 20 BC (estimated). Helped bury Jesus (John 19:39). Death unrecorded; est. c. AD 55.' WHERE id = 127;

-- ============================================================
-- LIFESPAN CORRECTIONS — Batch 2 (remaining NULL dates)
-- Sources: Ussher, Jewish tradition (Midrash, Talmud, Seder Olam),
-- Islamic tradition (Qur'an, Ibn Kathir), Josephus, scholarly consensus
-- ============================================================

-- Hagar: Sarah's Egyptian servant. Jewish tradition (Pirke de-Rabbi Eliezer 30) identifies her
-- as a daughter of Pharaoh. Islamic tradition (Ibn Kathir) records she lived in Beer-lahai-roi
-- after Abraham's death. Died c. 1850 BC, est. ~80 years.
UPDATE people SET death_year = -1850, date_notes = 'Ussher: born c. 1930 BC. Jewish tradition (Pirke de-Rabbi Eliezer 30) identifies as Pharaoh''s daughter. Islamic tradition (Ibn Kathir) says she lived near Beer-lahai-roi. Death unrecorded; est. c. 1850 BC (~80 years).' WHERE id = 58;

-- Stephen: born c. AD 1 based on being a mature leader by AD 35
UPDATE people SET birth_year = 1, date_notes = 'Born c. AD 1 (estimated). A Hellenistic Jewish believer, mature enough to be chosen as one of the Seven (Acts 6:5). First Christian martyr c. AD 35 (Acts 7:54-60).' WHERE id = 44;

-- Luke: physician; tradition places birth c. AD 5-15. Antioch tradition (Eusebius, HE 3.4).
UPDATE people SET birth_year = 10, date_notes = 'Born c. AD 10 in Antioch (Eusebius, HE 3.4). Physician (Col 4:14); author of Luke-Acts. Tradition: died c. AD 84 in Boeotia.' WHERE id = 47;

-- Martha: sister of Lazarus; tradition (Eastern Orthodox) places death c. AD 60-80
UPDATE people SET death_year = 60, date_notes = 'Born c. 10 BC (estimated). Sister of Lazarus and Mary (John 11; Luke 10:38-42). Death unrecorded; Eastern tradition est. c. AD 60.' WHERE id = 124;

-- Dinah: daughter of Jacob and Leah; incident at Shechem c. 1732 BC. Midrash (Gen. Rabbah 80:11)
-- says she married Job. Entered Egypt with Jacob (Gen 46:15). Est. death c. 1680 BC.
UPDATE people SET death_year = -1680, date_notes = 'Ussher: born c. 1748 BC. Midrash (Gen. Rabbah 80:11) identifies her as Job''s wife. Entered Egypt with Jacob (Gen 46:15). Est. death c. 1680 BC.' WHERE id = 162;

-- Dan: son of Jacob and Bilhah; entered Egypt (Gen 46:23). Talmud (Sotah 10a) links Dan to Samson.
UPDATE people SET death_year = -1615, date_notes = 'Ussher: born c. 1745 BC. Son of Bilhah (Gen 30:6). Entered Egypt (Gen 46:23). Death unrecorded; est. c. 1615 BC (~130 years, patriarchal pattern).' WHERE id = 165;

-- Naphtali: son of Jacob and Bilhah; entered Egypt (Gen 46:24). Died in Egypt; 133 years per Testament of Naphtali.
UPDATE people SET death_year = -1610, date_notes = 'Ussher: born c. 1743 BC. Son of Bilhah (Gen 30:8). Entered Egypt (Gen 46:24). Testament of Naphtali records 133 years; est. death c. 1610 BC.' WHERE id = 166;

-- Gad: son of Jacob and Zilpah; entered Egypt (Gen 46:16). Testament of Gad records 127 years.
UPDATE people SET death_year = -1614, date_notes = 'Ussher: born c. 1741 BC. Son of Zilpah (Gen 30:11). Entered Egypt (Gen 46:16). Testament of Gad records 127 years; est. death c. 1614 BC.' WHERE id = 167;

-- Asher: son of Jacob and Zilpah; entered Egypt (Gen 46:17). Testament of Asher records 127 years (like Gad).
UPDATE people SET death_year = -1612, date_notes = 'Ussher: born c. 1739 BC. Son of Zilpah (Gen 30:13). Entered Egypt (Gen 46:17). Testament of Asher records 127 years; est. death c. 1612 BC.' WHERE id = 168;

-- Issachar: son of Jacob and Leah; entered Egypt (Gen 46:13). Testament of Issachar records 122 years.
UPDATE people SET death_year = -1615, date_notes = 'Ussher: born c. 1737 BC. Son of Leah (Gen 30:18). Entered Egypt (Gen 46:13). Testament of Issachar records 122 years; est. death c. 1615 BC.' WHERE id = 169;

-- Zebulun: son of Jacob and Leah; entered Egypt (Gen 46:14). Testament of Zebulun records 114 years.
UPDATE people SET death_year = -1621, date_notes = 'Ussher: born c. 1735 BC. Son of Leah (Gen 30:20). Entered Egypt (Gen 46:14). Testament of Zebulun records 114 years; est. death c. 1621 BC.' WHERE id = 170;

-- Manasseh son of Joseph: adopted by Jacob (Gen 48). Half-tribe settled east of Jordan.
UPDATE people SET death_year = -1600, date_notes = 'Ussher: born c. 1715 BC in Egypt (Gen 41:51). Adopted by Jacob (Gen 48). Death unrecorded; est. c. 1600 BC based on Egyptian sojourn chronology.' WHERE id = 171;

-- Ephraim: second son of Joseph; adopted by Jacob with firstborn blessing (Gen 48:14-20).
UPDATE people SET death_year = -1600, date_notes = 'Ussher: born c. 1713 BC in Egypt (Gen 41:52). Given firstborn blessing by Jacob (Gen 48:14-20). Death unrecorded; est. c. 1600 BC.' WHERE id = 172;

-- Tamar: daughter-in-law of Judah; mother of Perez and Zerah (Gen 38). In Jesus' genealogy (Matt 1:3).
UPDATE people SET death_year = -1660, date_notes = 'Ussher: born c. 1730 BC. Mother of Perez (Gen 38:29). In messianic line (Matt 1:3). Death unrecorded; est. c. 1660 BC.' WHERE id = 173;

-- Perez: son of Judah and Tamar; entered Egypt (Gen 46:12). Ancestor of David (Ruth 4:18-22).
UPDATE people SET death_year = -1620, date_notes = 'Ussher: born c. 1725 BC. Entered Egypt with Jacob (Gen 46:12). Ancestor of David (Ruth 4:18-22). Death unrecorded; est. c. 1620 BC.' WHERE id = 174;

-- Melchizedek: king of Salem, priest of God Most High. Jewish tradition (Talmud Nedarim 32b)
-- identifies him with Shem (d. 1848 BC). Hebrews 7:3 says "without beginning of days or end of life"
-- as a priestly type. Using Shem identification per Talmud.
UPDATE people SET death_year = -1848, date_notes = 'Gen 14:18-20; Ps 110:4; Heb 7. Talmud (Nedarim 32b) identifies Melchizedek with Shem, d. 1848 BC. Heb 7:3 describes him without genealogy as a priestly type of Christ. Using Shem identification per Jewish tradition.' WHERE id = 176;

-- Potiphar: Egyptian officer; disappears from narrative after Gen 39.
UPDATE people SET death_year = -1710, date_notes = 'Gen 39:1-20. Captain of Pharaoh''s guard. Disappears from narrative after Joseph''s imprisonment. Est. death c. 1710 BC.' WHERE id = 177;

-- Asenath: wife of Joseph; mother of Manasseh and Ephraim. Jewish tradition (Joseph and Asenath) elaborates her conversion.
UPDATE people SET death_year = -1640, date_notes = 'Gen 41:45, 50-52. Daughter of Potiphera, priest of On. Jewish apocryphal tradition (Joseph and Asenath) describes her conversion. Est. death c. 1640 BC.' WHERE id = 178;

-- Balak: king of Moab; disappears after Numbers 24. Contemporary of Moses.
UPDATE people SET death_year = -1450, date_notes = 'Num 22-24. King of Moab who hired Balaam. Disappears after Balaam''s oracles. Est. death c. 1450 BC, before Conquest.' WHERE id = 181;

-- Bezalel: master craftsman of the Tabernacle; filled with God's Spirit (Exod 31:1-11).
UPDATE people SET death_year = -1440, date_notes = 'Exod 31:1-11; 35:30-35. Filled with the Spirit for Tabernacle construction. Death unrecorded; est. c. 1440 BC (active during wilderness period).' WHERE id = 186;

-- Jael: Kenite woman who killed Sisera (Judg 4:17-22). Blessed by Deborah (Judg 5:24).
UPDATE people SET death_year = -1200, date_notes = 'Judg 4:17-22; 5:24-27. Killed Sisera with a tent peg. Death unrecorded; est. c. 1200 BC.' WHERE id = 190;

-- Delilah: Philistine woman; betrayed Samson c. 1123 BC (Judg 16:4-21). Disappears after Samson's capture.
UPDATE people SET death_year = -1100, date_notes = 'Judg 16:4-21. Betrayed Samson to the Philistines c. 1123 BC. Disappears from narrative; est. death c. 1100 BC.' WHERE id = 193;

-- Widow of Zarephath: fed Elijah during famine in Ahab's reign (918-897 per Ussher). Jesus cites her (Luke 4:26).
UPDATE people SET death_year = -870, date_notes = '1 Kgs 17:8-24; Luke 4:25-26. Cared for Elijah during Ahab''s reign c. 910 BC per Ussher. Son raised from death. Est. death c. 870 BC.' WHERE id = 209;

-- Gehazi: servant of Elisha; struck with leprosy (2 Kgs 5:27). Elisha's ministry c. 896-825 per Ussher.
UPDATE people SET death_year = -810, date_notes = '2 Kgs 4:12-37; 5:20-27; 8:4-5. Struck with leprosy for greed during Elisha''s ministry (c. 896-825 BC per Ussher). Still alive when telling the king of Elisha (2 Kgs 8:4-5). Est. death c. 810 BC.' WHERE id = 210;

-- Shunammite Woman: wealthy woman; son raised by Elisha (2 Kgs 4:8-37). Elisha's ministry c. 896-825 per Ussher.
UPDATE people SET death_year = -820, date_notes = '2 Kgs 4:8-37; 8:1-6. Son raised by Elisha during his ministry (c. 896-825 BC per Ussher). Returned from Philistia after 7-year absence. Est. death c. 820 BC.' WHERE id = 211;

-- Vashti: deposed c. 483 BC (Esth 1). Talmud (Megillah 12b) identifies her as granddaughter of Nebuchadnezzar.
UPDATE people SET death_year = -470, date_notes = 'Esth 1:1-22. Deposed c. 483 BC. Talmud (Megillah 12b) identifies her as Nebuchadnezzar''s granddaughter. Death unrecorded; est. c. 470 BC.' WHERE id = 227;

-- Barabbas: released c. AD 33 (Matt 27:15-26). Nothing further known.
UPDATE people SET death_year = 55, date_notes = 'Matt 27:15-26. Criminal released instead of Jesus c. AD 30-33. No further record; est. death c. AD 55.' WHERE id = 237;

-- Jairus: synagogue ruler whose daughter was raised (Mark 5:22-43). No further record.
UPDATE people SET death_year = 50, date_notes = 'Mark 5:22-43; Luke 8:41-56. Synagogue ruler in Galilee. Daughter raised by Jesus c. AD 29. Death unrecorded; est. c. AD 50.' WHERE id = 241;

-- ============================================================
-- EVENTS
-- ============================================================
INSERT INTO events (name, start_year, end_year, start_approx, end_approx, date_confidence, category, significance, description, date_notes, sort_order) VALUES
-- Primeval
('Creation',              -4004, NULL, 1, 1, 'traditional', 'creation',  'major', 'God creates the heavens and the earth in six days.', 'Ussher: 4004 BC (AM 1). October 23, 4004 BC per Annales.', 10),
('The Fall',              -4004, NULL, 1, 1, 'traditional', 'judgment',  'major', 'Adam and Eve sin; humanity falls.', 'Ussher: 4004 BC.', 20),
('The Flood',             -2349, -2348, 1, 1, 'traditional', 'judgment', 'major', 'God sends a worldwide flood; Noah and family survive.', 'Ussher: began 2349 BC (AM 1656), ended 2348 BC.', 30),
('Tower of Babel',        -2247, NULL, 1, 1, 'traditional', 'judgment',  'major', 'God confuses languages and scatters people.', 'Ussher: 2247 BC (AM 1757), when Peleg was born and the earth was divided (Gen 10:25).', 40),

-- Patriarchs
('Call of Abraham',       -1921, NULL, 1, 1, 'traditional', 'covenant',  'major', 'God calls Abram to leave Ur and go to Canaan.', 'Ussher: 1921 BC (AM 2083). Abraham aged 75 (Gen 12:4), after Terah died at 205 (Acts 7:4).', 50),
('Abrahamic Covenant',    -1913, NULL, 1, 1, 'traditional', 'covenant',  'major', 'God makes a covenant with Abraham (Genesis 15).', 'Ussher: c. 1913 BC (AM 2091).', 60),
('Binding of Isaac',      -1872, NULL, 1, 1, 'traditional', 'miracle',   'major', 'Abraham''s near-sacrifice of Isaac on Mount Moriah.', 'Ussher: c. 1872 BC. Isaac approximately 24 years old.', 70),
('Destruction of Sodom and Gomorrah', -1897, NULL, 1, 1, 'traditional', 'judgment', 'major', 'God rains fire and brimstone on Sodom and Gomorrah for their wickedness. Lot and his daughters escape.', 'Ussher: c. 1897 BC (Gen 19). Abraham was 99 years old.', 80),
('Covenant of Circumcision', -1897, NULL, 1, 1, 'traditional', 'covenant', 'major', 'God establishes circumcision as the sign of the Abrahamic covenant. Abram renamed Abraham, Sarai renamed Sarah.', 'Ussher: c. 1897 BC. Abraham aged 99 (Gen 17:1, 24).', 90),
('Jacob Wrestles God',    -1739, NULL, 1, 1, 'traditional', 'miracle',   'minor', 'Jacob wrestles with God and is renamed Israel.', 'Ussher: c. 1739 BC (Gen 32:22-32).', 100),
('Joseph Sold into Slavery',-1728,NULL,1, 1, 'traditional', 'other',     'minor', 'Joseph''s brothers sell him to traders going to Egypt.', 'Ussher: c. 1728 BC (Joseph aged 17, Gen 37:2).', 110),
('Joseph Made Ruler of Egypt', -1715, NULL, 1, 1, 'traditional', 'other', 'major', 'Joseph interprets Pharaoh''s dream and is made second-in-command over all Egypt at age 30.', 'Ussher: c. 1715 BC. Joseph aged 30 (Gen 41:46).', 120),

-- Egypt & Exodus
('Israel Enters Egypt',   -1706, NULL, 1, 1, 'traditional', 'other',     'major', 'Jacob''s family settles in Egypt.', 'Ussher: 1706 BC (AM 2298). Jacob aged 130 (Gen 47:9).', 130),
('The Exodus',            -1491, NULL, 1, 1, 'traditional', 'salvation', 'major', 'God delivers Israel from slavery in Egypt through Moses.', 'Ussher: 1491 BC (AM 2513). 430 years from Call of Abraham (Gal 3:17; Exod 12:40-41).', 140),
('Crossing the Red Sea',  -1491, NULL, 1, 1, 'traditional', 'miracle',   'major', 'God parts the Red Sea for Israel to cross.', 'Ussher: 1491 BC.', 150),
('Giving of the Law',     -1491, NULL, 1, 1, 'traditional', 'law',       'major', 'God gives the Ten Commandments and Torah at Mount Sinai.', 'Ussher: 1491 BC (AM 2513), third month after Exodus.', 160),
('Wilderness Wandering',  -1491, -1451, 1, 1, 'traditional', 'judgment', 'major', 'Israel wanders 40 years due to unbelief.', 'Ussher: 1491-1451 BC.', 170),
('Tabernacle Completed',  -1490, NULL, 1, 1, 'traditional', 'other',     'major', 'Moses erects the Tabernacle on the first day of the first month of the second year after the Exodus.', 'Ussher: 1490 BC (Exod 40:17). One year after the Exodus.', 180),

-- Conquest & Judges
('Conquest of Canaan',    -1451, -1420, 1, 1, 'traditional', 'conquest',  'major', 'Joshua leads Israel into the Promised Land.', 'Ussher: began 1451 BC (AM 2553).', 190),
('Fall of Jericho',       -1451, NULL, 1, 1, 'traditional', 'miracle',   'major', 'Walls of Jericho fall after Israel marches around them.', 'Ussher: 1451 BC.', 200),
('Period of the Judges',  -1420, -1095, 1, 1, 'possible',   'other',     'major', 'Cycle of sin, oppression, and deliverance by judges.', 'Ussher: c. 1420-1095 BC. Exact chronology is debated; periods may overlap.', 210),
('Deborah Defeats Sisera',-1245, NULL, 1, 1, 'possible',    'war',       'minor', 'Deborah and Barak defeat Canaanite general Sisera.', 'Ussher: c. 1245 BC.', 220),
('Gideon Defeats Midian', -1205, NULL, 1, 1, 'possible',    'war',       'minor', 'Gideon defeats the Midianites with 300 men.', 'Ussher: c. 1205 BC.', 230),
('Ark Captured by Philistines', -1125, NULL, 1, 1, 'traditional', 'judgment', 'minor', 'The Philistines capture the Ark of the Covenant at the battle of Aphek. Eli dies upon hearing the news.', 'Ussher: c. 1125 BC (1 Sam 4:1-22). End of Eli''s 40-year judgeship.', 240),

-- United Kingdom
('Saul Anointed King',    -1095, NULL, 1, 1, 'traditional', 'other',     'major', 'Samuel anoints Saul as the first king of Israel.', 'Ussher: 1095 BC (AM 2909).', 250),
('David Anointed King',   -1055, NULL, 1, 1, 'traditional', 'other',     'major', 'David becomes king of all Israel.', 'Ussher: 1055 BC (combined reign, 2 Sam 5:4-5).', 260),
('David Captures Jerusalem',-1049,NULL,1, 1, 'traditional', 'conquest',  'major', 'David conquers the Jebusite city and makes it his capital.', 'Ussher: c. 1049 BC.', 270),
('Davidic Covenant',      -1045, NULL, 1, 1, 'traditional', 'covenant',  'major', 'God promises David an everlasting kingdom (2 Samuel 7).', 'Ussher: c. 1045 BC.', 280),
('Solomon Builds Temple',  -1012, -1005, 1, 1, 'traditional', 'other',     'major', 'Solomon constructs the First Temple in Jerusalem.', 'Ussher: began 1012 BC (AM 2992), 4th year of Solomon (1 Kgs 6:1). 480 years after Exodus.', 290),

-- Divided Kingdom
('Kingdom Divides',        -975, NULL, 1, 1, 'traditional',    'judgment',  'major', 'After Solomon, kingdom splits into Israel (north) and Judah (south).', 'Ussher: 975 BC (AM 3029), upon Solomon''s death.', 300),
('Elijah on Mount Carmel', -905, NULL, 1, 1, 'traditional', 'miracle',   'major', 'Elijah defeats the prophets of Baal with fire from heaven.', 'Ussher: during Ahab''s reign (918-897 BC). 1 Kgs 18:20-40.', 310),
('Fall of Samaria',        -721, NULL, 0, 1, 'certain',     'judgment',  'major', 'Assyria conquers the northern kingdom of Israel.', 'Ussher: 721 BC (AM 3283). Well-attested in Assyrian records.', 320),
('Hezekiah''s Deliverance',-701, NULL, 0, 1, 'certain',     'miracle',   'major', 'God destroys 185,000 Assyrian soldiers besieging Jerusalem.', 'Ussher: 701 BC, 14th year of Hezekiah (2 Kgs 18:13; Isa 36:1). Sennacherib''s prism confirms the siege.', 330),
('Josiah''s Reforms',      -624, NULL, 0, 1, 'traditional', 'other',     'minor', 'King Josiah finds the Book of the Law and reforms worship.', 'Ussher: 18th year of Josiah (640-18=622 BC, 2 Kgs 22:3). Book found c. 624-622 BC.', 340),

-- Exile
('Fall of Jerusalem',      -586, NULL, 0, 1, 'certain',     'judgment',  'major', 'Babylon destroys Jerusalem and the First Temple.', 'One of the best-dated events in biblical history.', 350),
('Babylonian Exile',       -586, -538, 0, 0, 'certain',     'exile',     'major', 'Judah is exiled to Babylon for approximately 70 years.', NULL, 360),

-- Return & Restoration
('Edict of Cyrus',         -538, NULL, 0, 1, 'certain',     'salvation', 'major', 'Cyrus the Great allows Jews to return and rebuild the Temple.', 'Confirmed by the Cyrus Cylinder.', 370),
('Second Temple Built',    -516, NULL, 0, 1, 'certain',     'other',     'major', 'Zerubbabel completes the rebuilding of the Temple.', NULL, 380),
('Ezra''s Return',         -458, NULL, 0, 1, 'probable',    'other',     'minor', 'Ezra leads a second return and reforms worship.', NULL, 390),
('Nehemiah Rebuilds Walls',-445, NULL, 0, 1, 'probable',    'other',     'major', 'Nehemiah rebuilds Jerusalem''s walls in 52 days.', NULL, 400),
('Esther Saves Her People',-473, NULL, 1, 1, 'possible',    'salvation', 'major', 'Queen Esther intercedes to save the Jews from Haman''s plot.', 'During reign of Xerxes I (Ahasuerus).', 410),

-- Life of Christ
('Birth of Jesus',          -5, NULL, 1, 1, 'probable',    'birth',     'major', 'Jesus is born in Bethlehem.', 'Before Herod''s death in 4 BC; Luke 2.', 420),
('Baptism of Jesus',        26, NULL, 1, 1, 'probable',    'other',     'major', 'Jesus is baptized by John in the Jordan River.', 'Luke 3:1 — 15th year of Tiberius ~AD 26-29.', 430),
('Sermon on the Mount',     28, NULL, 1, 1, 'possible',    'other',     'major', 'Jesus teaches the Beatitudes and core ethics.', NULL, 440),
('Crucifixion',             33, NULL, 1, 1, 'probable',    'salvation', 'major', 'Jesus is crucified outside Jerusalem.', 'AD 30 or 33 based on Passover calculations.', 900),
('Resurrection',            33, NULL, 1, 1, 'probable',    'miracle',   'major', 'Jesus rises from the dead on the third day.', NULL, 910),
('Ascension',               33, NULL, 1, 1, 'probable',    'miracle',   'major', 'Jesus ascends to heaven from the Mount of Olives.', NULL, 920),

-- Apostolic Age
('Pentecost',               33, NULL, 1, 1, 'probable',    'miracle',   'major', 'The Holy Spirit descends; the church is born.', NULL, 930),
('Stoning of Stephen',      35, NULL, 1, 1, 'probable',    'other',     'minor', 'Stephen becomes the first Christian martyr.', NULL, 940),
('Conversion of Paul',      35, NULL, 1, 1, 'probable',    'miracle',   'major', 'Saul encounters the risen Christ on the road to Damascus.', 'Galatians 1:15-18 correlates with Acts 9.', 950),
('Paul''s First Missionary Journey', 47, 49, 1, 1, 'probable', 'other', 'minor', 'Paul and Barnabas travel through Cyprus and Asia Minor.', NULL, 960),
('Council of Jerusalem',    49, NULL, 1, 1, 'probable',    'other',     'major', 'Church leaders decide Gentiles need not follow all Jewish law.', NULL, 970),
('Paul''s Second Missionary Journey', 50, 53, 1, 1, 'probable', 'other', 'minor', 'Paul brings the gospel to Greece.', NULL, 980),
('Paul''s Third Missionary Journey',  54, 58, 1, 1, 'probable', 'other', 'minor', 'Paul strengthens churches in Asia Minor and Greece.', NULL, 990),
('Destruction of Jerusalem', 70, NULL, 0, 1, 'certain',    'judgment',  'major', 'Rome destroys Jerusalem and the Second Temple.', 'One of the most securely dated events.', 1000),
('John Writes Revelation',  95, NULL, 1, 1, 'traditional', 'prophecy',  'major', 'The Apostle John receives apocalyptic visions on Patmos.', 'Early date (~AD 65) vs. late date (~AD 95).', 1010),
('Death of John',           100, NULL, 1, 1, 'possible',    'other',    'minor', 'The last apostle dies, ending the Apostolic Age.', NULL, 1020),

-- Miracles of Jesus — ordered by biblical narrative sequence
-- Early Galilean Ministry (John 2 – Luke 5)
('Water Turned to Wine',    27, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus turns water into wine at a wedding feast in Cana.', 'First recorded miracle; John 2:1-11.', 450),
('Healing of the Official''s Son', 27, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a royal official''s son in Capernaum from a distance.', 'John 4:46-54; second sign in John.', 460),
('Great Catch of Fish',     27, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus directs a miraculous catch of fish on the Sea of Galilee.', 'Luke 5:1-11; calling of the first disciples.', 470),
('Healing of a Demon-Possessed Man in Capernaum', 27, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus casts out an unclean spirit in the Capernaum synagogue.', 'Mark 1:21-28; Luke 4:31-37.', 480),
('Healing of Peter''s Mother-in-Law', 27, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals Simon Peter''s mother-in-law of a fever.', 'Matthew 8:14-15; Mark 1:29-31; Luke 4:38-39.', 490),
('Cleansing of a Leper',    27, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a man with leprosy by touching him.', 'Matthew 8:1-4; Mark 1:40-45; Luke 5:12-16.', 500),
('Healing of the Paralytic', 27, NULL, 1, 1, 'possible', 'miracle', 'major', 'Friends lower a paralyzed man through the roof; Jesus forgives sins and heals.', 'Matthew 9:1-8; Mark 2:1-12; Luke 5:17-26.', 510),
-- Middle Ministry (John 5 – Luke 8)
('Healing at the Pool of Bethesda', 28, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a man who had been an invalid for 38 years.', 'John 5:1-17; on a Sabbath.', 520),
('Healing of a Withered Hand', 28, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a man''s withered hand on the Sabbath in the synagogue.', 'Matthew 12:9-14; Mark 3:1-6; Luke 6:6-11.', 530),
('Healing of the Centurion''s Servant', 28, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus marvels at a Roman centurion''s faith and heals his servant from afar.', 'Matthew 8:5-13; Luke 7:1-10.', 540),
('Raising of the Widow''s Son at Nain', 28, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus raises a widow''s dead son back to life.', 'Luke 7:11-17; only in Luke.', 550),
('Calming the Storm',       28, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus rebukes the wind and waves on the Sea of Galilee.', 'Matthew 8:23-27; Mark 4:35-41; Luke 8:22-25.', 560),
('Healing of the Gerasene Demoniac', 28, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus casts a legion of demons into a herd of swine.', 'Matthew 8:28-34; Mark 5:1-20; Luke 8:26-39.', 570),
-- Late Galilean Ministry (Mark 5 – Mark 8)
('Healing of the Woman with the Issue of Blood', 29, NULL, 1, 1, 'possible', 'miracle', 'minor', 'A woman touches Jesus'' garment and is healed after 12 years of bleeding.', 'Matthew 9:20-22; Mark 5:25-34; Luke 8:43-48.', 580),
('Raising of Jairus'' Daughter', 29, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus raises a synagogue leader''s 12-year-old daughter from the dead.', 'Matthew 9:18-26; Mark 5:21-43; Luke 8:40-56.', 590),
('Healing of Two Blind Men', 29, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus restores sight to two blind men who follow him crying for mercy.', 'Matthew 9:27-31.', 600),
('Healing of a Mute Man',   29, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus casts out a demon and the mute man speaks.', 'Matthew 9:32-34.', 610),
('Feeding of the 5,000',    29, NULL, 1, 1, 'probable', 'miracle', 'major', 'Jesus feeds 5,000 men (plus women and children) with five loaves and two fish.', 'Matthew 14:13-21; Mark 6:30-44; Luke 9:10-17; John 6:1-15. Only miracle in all four Gospels.', 620),
('Walking on Water',        29, NULL, 1, 1, 'probable', 'miracle', 'major', 'Jesus walks on the Sea of Galilee toward his disciples'' boat.', 'Matthew 14:22-33; Mark 6:45-52; John 6:16-21.', 630),
('Healing of the Syrophoenician Woman''s Daughter', 29, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a Gentile woman''s demon-possessed daughter.', 'Matthew 15:21-28; Mark 7:24-30.', 640),
('Healing of a Deaf and Mute Man', 29, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a deaf man with a speech impediment in the Decapolis.', 'Mark 7:31-37.', 650),
('Feeding of the 4,000',    29, NULL, 1, 1, 'probable', 'miracle', 'major', 'Jesus feeds 4,000 with seven loaves and a few fish.', 'Matthew 15:32-39; Mark 8:1-10.', 660),
-- Transfiguration & Later Ministry (Matt 17 – John 9)
('Healing of a Blind Man at Bethsaida', 30, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a blind man in two stages at Bethsaida.', 'Mark 8:22-26; only in Mark.', 670),
('Transfiguration',         30, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus is transfigured on a mountain; Moses and Elijah appear.', 'Matthew 17:1-13; Mark 9:2-13; Luke 9:28-36.', 680),
('Healing of a Boy with a Demon', 30, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus casts out a demon the disciples could not.', 'Matthew 17:14-21; Mark 9:14-29; Luke 9:37-43.', 690),
('Coin in the Fish''s Mouth', 30, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus instructs Peter to find a coin in a fish''s mouth for Temple tax.', 'Matthew 17:24-27; only in Matthew.', 700),
('Healing of the Man Born Blind', 30, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus gives sight to a man blind from birth using mud and saliva.', 'John 9:1-41; extended discourse on spiritual blindness.', 710),
('Healing of a Crippled Woman', 30, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a woman bent over for 18 years on the Sabbath.', 'Luke 13:10-17; only in Luke.', 720),
-- Perean Ministry (Luke 14 – John 11)
('Healing of a Man with Dropsy', 31, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals a man with dropsy (edema) on the Sabbath.', 'Luke 14:1-6; only in Luke.', 730),
('Raising of Lazarus',      31, NULL, 1, 1, 'possible', 'miracle', 'major', 'Jesus raises Lazarus from the dead after four days in the tomb.', 'John 11:1-44; catalyst for the plot to kill Jesus.', 740),
('Healing of Ten Lepers',   31, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals ten lepers; only one (a Samaritan) returns to give thanks.', 'Luke 17:11-19; only in Luke.', 750),
-- Final Week & Post-Resurrection (Matt 20 – John 21)
('Healing of Blind Bartimaeus', 33, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals blind Bartimaeus on the road out of Jericho.', 'Matthew 20:29-34; Mark 10:46-52; Luke 18:35-43.', 850),
('Healing of Two Blind Men at Jericho', 33, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus heals two blind men near Jericho.', 'Matthew 20:29-34; variant of the Bartimaeus narrative.', 855),
('Cursing of the Fig Tree', 33, NULL, 1, 1, 'possible', 'miracle', 'minor', 'Jesus curses a barren fig tree and it withers.', 'Matthew 21:18-22; Mark 11:12-14, 20-25.', 860),
('Healing of Malchus'' Ear', 33, NULL, 1, 1, 'probable', 'miracle', 'minor', 'Jesus heals the ear of the high priest''s servant during his arrest.', 'Luke 22:49-51; John 18:10-11.', 870),
('Catch of 153 Fish',       33, NULL, 1, 1, 'probable', 'miracle', 'minor', 'The risen Jesus directs a miraculous catch of 153 fish.', 'John 21:1-14; post-resurrection appearance.', 925),

-- Non-Jesus miracles
('Healing of Naaman', -850, NULL, 1, 1, 'possible', 'miracle', 'major', 'Syrian commander Naaman is healed of leprosy after washing in the Jordan River at Elisha''s command.', '2 Kings 5:1-27; during the ministry of Elisha.', 315),

-- ============================================================
-- CHURCH HISTORY EVENTS (IDs 95–159)
-- ============================================================
-- Era: Early Church & Persecution (100–313) ────────────────────
('Martyrdom of Ignatius of Antioch', 108, NULL, 0, 1, 'probable', 'other', 'moderate', 'Bishop Ignatius is executed in Rome; his letters on church order and the real presence of Christ are among the earliest post-apostolic writings.', 'Eusebius, Church History III.36.', 1010),
('Martyrdom of Polycarp', 155, NULL, 0, 1, 'probable', 'other', 'moderate', 'Bishop Polycarp of Smyrna is burned at the stake at age 86, saying "Eighty-six years I have served Him, and He never did me any injury."', 'Martyrdom of Polycarp; date debated (155 or 167).', 1020),
('Irenaeus Writes Against Heresies', 180, NULL, 0, 1, 'probable', 'other', 'moderate', 'Irenaeus of Lyon publishes Against Heresies, establishing apostolic succession and refuting Gnosticism.', 'Against Heresies, c. 180 AD.', 1030),
('Origen Opens Catechetical School', 203, NULL, 0, 1, 'probable', 'other', 'minor', 'Origen becomes head of the catechetical school in Alexandria at age 18, pioneering biblical scholarship and allegorical interpretation.', 'Eusebius, Church History VI.', 1040),
('Diocletian Persecution Begins', 303, NULL, 0, 1, 'certain', 'other', 'moderate', 'Emperor Diocletian orders the most severe empire-wide persecution: churches destroyed, scriptures burned, clergy imprisoned.', 'Eusebius, Church History VIII; Diocletian issued edicts in 303-304.', 1050),
('Edict of Milan', 313, NULL, 0, 0, 'certain', 'other', 'major', 'Emperors Constantine and Licinius declare religious tolerance throughout the Roman Empire, ending the age of persecution.', 'Lactantius, De Mortibus Persecutorum 48; Eusebius, Church History X.5.', 1060),

-- Era: Imperial Christianity (313–476) ─────────────────────────
('Council of Nicaea', 325, NULL, 0, 0, 'certain', 'other', 'major', 'The first ecumenical council defines the deity of Christ and produces the Nicene Creed: "God from God, Light from Light, true God from true God."', 'First Ecumenical Council, convened by Constantine in Nicaea.', 1070),
('Athanasius Lists the 27 NT Books', 367, NULL, 0, 0, 'certain', 'other', 'major', 'In his 39th Festal Letter, Athanasius of Alexandria lists the 27 books of the New Testament canon — the earliest known list matching the modern NT.', 'Athanasius, 39th Festal Letter (367 AD).', 1080),
('Council of Carthage Finalizes Canon', 397, NULL, 0, 0, 'certain', 'other', 'major', 'The Council of Carthage formally ratifies the 27-book New Testament canon, confirming the list Athanasius published 30 years earlier.', 'Council of Carthage (397 AD).', 1085),
('Jerome Completes the Vulgate', 405, NULL, 0, 1, 'probable', 'other', 'major', 'Jerome finishes his Latin translation of the Bible from Hebrew and Greek — the standard Western Bible for over 1,000 years.', 'Jerome completed the OT translation c. 405. The Vulgate became the standard Bible of the Western church.', 1090),
('Council of Chalcedon', 451, NULL, 0, 0, 'certain', 'other', 'major', 'The fourth ecumenical council defines Christ as one person with two natures — fully God and fully man — "without confusion, without change, without division, without separation."', 'Fourth Ecumenical Council, Chalcedon (451 AD).', 1100),
('Fall of the Western Roman Empire', 476, NULL, 0, 0, 'certain', 'other', 'moderate', 'Romulus Augustulus, the last Western Roman emperor, is deposed. Christianity is now the dominant cultural force in a fragmented Western Europe.', 'Traditional date: 476 AD.', 1110),

-- Era: Early Medieval (476–1054) ───────────────────────────────
('Benedict Writes His Rule', 530, NULL, 0, 1, 'probable', 'other', 'moderate', 'Benedict of Nursia writes the Rule of St. Benedict — "ora et labora" (pray and work) — the foundation for Western monasticism and the preservation of learning through the Dark Ages.', 'Rule of St. Benedict, c. 530 AD.', 1120),
('Synod of Whitby', 664, NULL, 0, 0, 'certain', 'other', 'minor', 'King Oswiu of Northumbria rules in favor of Roman over Celtic church practices, unifying English Christianity under Rome.', 'Bede, Ecclesiastical History of the English People, III.25.', 1130),
('Rise of Islam and Muslim Conquests', 632, 750, 0, 1, 'certain', 'other', 'moderate', 'Following Muhammad''s death (632), Muslim armies conquer the Christian heartlands of Syria, Egypt, North Africa, and Persia within a century — permanently altering the geography of Christianity.', 'Rapid expansion of the Rashidun and Umayyad caliphates, 632–750 AD.', 1140),
('Charlemagne Crowned Emperor', 800, NULL, 0, 0, 'certain', 'other', 'minor', 'Pope Leo III crowns Charlemagne Holy Roman Emperor on Christmas Day, fusing church and state in medieval Europe.', 'December 25, 800 AD; recorded by Einhard and the Royal Frankish Annals.', 1150),

-- Era: High Medieval & Crusades (1054–1400) ────────────────────
('Great Schism: East-West Split', 1054, NULL, 0, 0, 'certain', 'other', 'major', 'The Christian church splits into Roman Catholic (West) and Eastern Orthodox (East) over papal authority, the filioque clause, and liturgical differences. The mutual excommunications are not lifted until 1965.', 'The Schism of 1054; mutual excommunications between Patriarch Michael Cerularius and Cardinal Humbert.', 1160),
('Council of Clermont — First Crusade Called', 1095, NULL, 0, 0, 'certain', 'war', 'moderate', 'Pope Urban II calls Christians to liberate the Holy Land. The First Crusade captures Jerusalem in 1099, inaugurating two centuries of Crusading warfare.', 'Pope Urban II''s speech at the Council of Clermont, November 1095.', 1170),
('Francis of Assisi Founds the Franciscans', 1209, NULL, 0, 0, 'certain', 'other', 'moderate', 'Francis renounces his wealthy life and founds the Order of Friars Minor, preaching radical poverty, simplicity, and care for the poor.', 'Francis received papal approval in 1209/1210.', 1180),
('Thomas Aquinas Completes the Summa', 1274, NULL, 0, 1, 'probable', 'other', 'moderate', 'Aquinas leaves his Summa Theologiae unfinished at his death — the most influential work of Christian theology, synthesizing faith and reason.', 'Summa Theologiae written 1265–1274; left incomplete at Aquinas''s death.', 1190),
('John Wycliffe Translates the Bible into English', 1382, NULL, 0, 1, 'probable', 'other', 'major', 'Wycliffe and his followers produce the first complete English translation of the Bible from the Latin Vulgate — the "Morning Star of the Reformation."', 'Wycliffe Bible completed c. 1382-1395 by Wycliffe and his associates.', 1200),
('Jan Hus Martyred', 1415, NULL, 0, 0, 'certain', 'other', 'moderate', 'Czech reformer Jan Hus is burned at the stake at the Council of Constance for challenging papal authority and calling for Scripture in the common language.', 'July 6, 1415, at the Council of Constance.', 1210),

-- Era: Reformation (1400–1648) ─────────────────────────────────
('Gutenberg Prints the Bible', 1455, NULL, 0, 1, 'certain', 'other', 'major', 'Johannes Gutenberg produces the first printed Bible using movable type in Mainz, Germany — revolutionizing the spread of Scripture and making the Reformation possible.', 'Gutenberg Bible printed c. 1454-1455 in Mainz.', 1220),
('Martin Luther Posts the 95 Theses', 1517, NULL, 0, 0, 'certain', 'other', 'major', 'Luther nails 95 propositions against indulgences to the church door in Wittenberg, igniting the Protestant Reformation.', 'October 31, 1517.', 1230),
('Diet of Worms', 1521, NULL, 0, 0, 'certain', 'other', 'major', 'Luther refuses to recant before Emperor Charles V: "Here I stand, I can do no other." He is declared an outlaw of the Empire.', 'April 17-18, 1521.', 1240),
('Tyndale''s New Testament Published', 1526, NULL, 0, 0, 'certain', 'other', 'major', 'William Tyndale publishes the first printed English New Testament, translated from the Greek. 80% of his phrasing survives in the King James Version.', 'Tyndale NT printed in Worms, Germany, 1526; Tyndale executed 1536.', 1250),
('Calvin Publishes Institutes of the Christian Religion', 1536, NULL, 0, 0, 'certain', 'other', 'moderate', 'John Calvin publishes his systematic theology at age 26 — the foundational text of Reformed Christianity.', 'First edition 1536; expanded final edition 1559.', 1260),
('Council of Trent', 1545, 1563, 0, 0, 'certain', 'other', 'moderate', 'The Catholic Church''s Counter-Reformation council clarifies doctrine, reforms abuses, and reaffirms traditions challenged by Protestantism.', 'Council of Trent, 1545–1563 (three periods over 18 years).', 1270),
('King James Version Published', 1611, NULL, 0, 0, 'certain', 'other', 'major', 'The Authorized Version, commissioned by King James I of England and produced by 47 scholars, becomes the most influential English Bible for over 300 years.', 'Published 1611.', 1280),
('Westminster Confession of Faith', 1646, NULL, 0, 0, 'certain', 'other', 'moderate', 'The Westminster Assembly produces the most influential Reformed confession of faith, adopted by Presbyterian and Reformed churches worldwide.', 'Completed 1646; adopted by the Church of Scotland (1647) and English Parliament (1648).', 1285),
('Peace of Westphalia', 1648, NULL, 0, 0, 'certain', 'other', 'moderate', 'The treaties ending the Thirty Years'' War establish the principle of cuius regio, eius religio (whose realm, his religion), ending the era of religious wars in Europe.', 'Treaties signed October 24, 1648.', 1290),

-- Era: Enlightenment & Missions (1648–1900) ────────────────────
('John Wesley''s Aldersgate Experience', 1738, NULL, 0, 0, 'certain', 'other', 'moderate', 'Wesley feels his heart "strangely warmed" at a Moravian meeting on Aldersgate Street, launching the Methodist movement.', 'May 24, 1738.', 1300),
('Jonathan Edwards and the First Great Awakening', 1734, 1743, 0, 1, 'certain', 'other', 'moderate', 'Edwards'' sermon "Sinners in the Hands of an Angry God" (1741) and George Whitefield''s preaching spark the First Great Awakening across the American colonies and Britain.', 'First Great Awakening, c. 1734–1743.', 1310),
('William Carey Sails for India', 1793, NULL, 0, 0, 'certain', 'other', 'moderate', 'The "father of modern missions" arrives in India, beginning a lifelong work of Bible translation, education, and social reform.', 'Carey departed June 13, 1793; established Serampore Mission.', 1320),
('British and Foreign Bible Society Founded', 1804, NULL, 0, 0, 'certain', 'other', 'moderate', 'The world''s first Bible society is founded in London, dedicating itself to making the Scriptures available in every language.', 'Founded March 7, 1804.', 1330),
('American Bible Society Founded', 1816, NULL, 0, 0, 'certain', 'other', 'minor', 'Founded to distribute Bibles across the expanding American frontier.', 'Founded May 11, 1816 in New York.', 1335),
('Charles Spurgeon Begins Preaching in London', 1854, NULL, 0, 0, 'certain', 'other', 'minor', 'Spurgeon, the "Prince of Preachers," begins pastoring at New Park Street Chapel at age 19; his Metropolitan Tabernacle seats 5,000.', 'Spurgeon preached to millions over 38 years (1854–1892).', 1340),
('D.L. Moody''s Revival Campaigns', 1873, 1899, 0, 0, 'certain', 'other', 'minor', 'Dwight L. Moody''s transatlantic revival campaigns in Britain and America bring millions to evangelistic meetings. He founds Moody Bible Institute (1886).', 'Major campaigns: Britain (1873–75), America (1875–99).', 1350),

-- Era: Modern Era (1900–2026) ──────────────────────────────────
('Azusa Street Revival', 1906, 1909, 0, 0, 'certain', 'other', 'moderate', 'William Seymour leads a multiracial revival on Azusa Street in Los Angeles — the birth of the global Pentecostal movement, now encompassing over 600 million Christians.', 'Azusa Street Revival, 312 Azusa Street, April 1906 – c. 1909.', 1360),
('Edinburgh Missionary Conference', 1910, NULL, 0, 0, 'certain', 'other', 'moderate', 'The World Missionary Conference in Edinburgh brings together 1,200 delegates, launching the modern ecumenical movement and galvanizing Protestant missions.', 'June 14–23, 1910.', 1370),
('Barmen Declaration', 1934, NULL, 0, 0, 'certain', 'other', 'minor', 'The Confessing Church in Germany, led by Karl Barth, Dietrich Bonhoeffer, and Martin Niemöller, rejects Nazi ideology''s infiltration of the church.', 'Barmen Declaration, May 31, 1934.', 1380),
('Discovery of the Dead Sea Scrolls', 1947, NULL, 0, 0, 'certain', 'other', 'major', 'Bedouin shepherds discover ancient scrolls in caves near Qumran, including the oldest known manuscripts of the Hebrew Bible — confirming the remarkable accuracy of biblical transmission over a millennium.', 'First scrolls discovered in 1947; excavations continued through 1956.', 1390),
('State of Israel Established', 1948, NULL, 0, 0, 'certain', 'other', 'major', 'The modern State of Israel is declared, establishing Jewish sovereignty in the biblical promised land for the first time since 70 AD — seen by many Christians as prophetic fulfillment.', 'May 14, 1948.', 1400),
('Second Vatican Council', 1962, 1965, 0, 0, 'certain', 'other', 'moderate', 'Pope John XXIII convenes Vatican II, transforming Catholic worship (Mass in the vernacular), affirming religious liberty, and opening dialogue with Protestants and other faiths.', 'Vatican II, October 11, 1962 – December 8, 1965.', 1410),
('Billy Graham''s Global Crusades', 1949, 2005, 0, 1, 'certain', 'other', 'moderate', 'Graham preaches the gospel to an estimated 215 million people across 185 countries over a career spanning five decades.', 'Los Angeles Crusade (1949) launched Graham''s global ministry.', 1420),
('Lausanne Congress on World Evangelization', 1974, NULL, 0, 0, 'certain', 'other', 'minor', 'Billy Graham and John Stott convene 2,700 evangelical leaders from 150 nations; the resulting Lausanne Covenant defines evangelical mission for a generation.', 'July 16–25, 1974, Lausanne, Switzerland.', 1430),
('Fall of the Soviet Union', 1991, NULL, 0, 0, 'certain', 'other', 'moderate', 'The collapse of the USSR opens Eastern Europe and Central Asia to religious freedom after 70 years of state atheism, sparking a wave of church growth and Bible distribution.', 'December 26, 1991.', 1440),
('Christianity Shifts to the Global South', 2000, NULL, 0, 1, 'certain', 'other', 'moderate', 'By 2000, more Christians live in Africa, Asia, and Latin America than in Europe and North America — the most significant demographic shift in church history since the fall of Rome.', 'Philip Jenkins, The Next Christendom (2002); Pew Research Center data.', 1450),

-- Post-Resurrection Appearances of Jesus (IDs 143–148)
('Appearance to Mary Magdalene', 33, NULL, 1, 1, 'probable', 'other', 'major', 'The risen Jesus appears first to Mary Magdalene at the empty tomb. She initially mistakes him for the gardener until he calls her by name.', 'John 20:11-18; Mark 16:9-11. First post-resurrection appearance.', 911),
('Road to Emmaus',               33, NULL, 1, 1, 'probable', 'other', 'major', 'Jesus walks with two disciples on the road to Emmaus, explaining the scriptures. They recognize him when he breaks bread, then he vanishes.', 'Luke 24:13-35; Mark 16:12-13. On the day of resurrection.', 912),
('Appearance to the Disciples',  33, NULL, 1, 1, 'probable', 'other', 'major', 'The risen Jesus appears to the disciples behind locked doors on the evening of resurrection day. He shows his hands and side and breathes the Holy Spirit on them.', 'John 20:19-25; Luke 24:36-43. Thomas is absent.', 913),
('Appearance to Thomas',         33, NULL, 1, 1, 'probable', 'other', 'major', 'Eight days later, Jesus appears again. Thomas sees and touches his wounds and declares "My Lord and my God!" — the highest Christological confession in the Gospels.', 'John 20:26-29. "Blessed are those who have not seen and yet have believed."', 914),
('Restoration of Peter',         33, NULL, 1, 1, 'probable', 'other', 'major', 'After the catch of 153 fish, Jesus asks Peter three times "Do you love me?" — restoring him from his threefold denial and commissioning him to feed his sheep.', 'John 21:15-19. Parallels Peter''s three denials.', 926),
('Great Commission',             33, NULL, 1, 1, 'probable', 'other', 'major', 'On a mountain in Galilee, Jesus commands his disciples to go and make disciples of all nations, baptizing and teaching them. He promises to be with them always.', 'Matthew 28:16-20; Mark 16:15-18. Foundation of Christian mission.', 927),

-- New Testament Books Written (IDs 149–174)
-- Sorted chronologically by scholarly consensus date
('James Written',            49, NULL, 1, 1, 'possible', 'other', 'minor', 'James, brother of Jesus, writes the earliest NT epistle from Jerusalem — practical wisdom on faith and works, addressed to Jewish Christians scattered abroad.', 'Often dated AD 45-49, before the Council of Jerusalem. Some scholars date it later (AD 60s).', 965),
('Galatians Written',        49, NULL, 1, 1, 'probable', 'other', 'minor', 'Paul writes to the Galatian churches defending justification by faith alone against Judaizers who insisted Gentile converts must follow the Mosaic Law.', 'South Galatian theory: AD 49, before Jerusalem Council. North Galatian theory: AD 53-55.', 966),
('1 Thessalonians Written',  51, NULL, 1, 1, 'probable', 'other', 'minor', 'Paul writes from Corinth to encourage the young Thessalonian church — the earliest surviving Pauline letter, with teaching on the return of Christ.', 'Written during Paul''s second missionary journey, c. AD 50-51.', 975),
('2 Thessalonians Written',  51, NULL, 1, 1, 'probable', 'other', 'minor', 'Paul writes a follow-up to Thessalonica, correcting misunderstandings about the Day of the Lord and urging believers to continue working.', 'Written shortly after 1 Thessalonians, c. AD 51.', 976),
('1 Corinthians Written',    55, NULL, 1, 1, 'probable', 'other', 'minor', 'Paul writes from Ephesus to the divided Corinthian church, addressing disputes, immorality, spiritual gifts, and the resurrection — including the great love chapter (ch. 13).', 'Written during Paul''s extended stay in Ephesus, c. AD 53-55.', 985),
('Matthew Written',          55, NULL, 1, 1, 'possible', 'other', 'minor', 'The Gospel of Matthew is composed, presenting Jesus as the fulfillment of Old Testament prophecy, structured around five major discourses.', 'Traditional date: AD 50-60. Some scholars date it after AD 70. Likely written for a Jewish-Christian audience in Antioch.', 986),
('Mark Written',             55, NULL, 1, 1, 'possible', 'other', 'minor', 'Mark composes the earliest Gospel — a fast-paced, action-oriented account of Jesus'' ministry, based on Peter''s eyewitness testimony.', 'Traditionally written in Rome based on Peter''s preaching. Papias: "Mark, interpreter of Peter." Dated AD 50-65.', 987),
('2 Corinthians Written',    56, NULL, 1, 1, 'probable', 'other', 'minor', 'Paul writes his most personal letter from Macedonia, defending his apostleship and describing his sufferings — "when I am weak, then I am strong."', 'Written from Macedonia (likely Philippi), c. AD 55-56.', 988),
('Romans Written',           57, NULL, 1, 1, 'probable', 'other', 'minor', 'Paul writes his theological masterpiece from Corinth to the Roman church — the fullest exposition of justification by faith, the role of the Law, and God''s plan for Jews and Gentiles.', 'Written from Corinth during Paul''s third journey, c. AD 57. Phoebe carried the letter (Rom 16:1-2).', 989),
('Luke Written',             60, NULL, 1, 1, 'possible', 'other', 'minor', 'Luke the physician composes his orderly Gospel account, addressed to Theophilus — the most detailed account of Jesus'' birth and parables unique to Luke.', 'Traditional date: AD 58-63. Written before Acts. Possibly composed in Caesarea during Paul''s imprisonment.', 991),
('Ephesians Written',        60, NULL, 1, 1, 'possible', 'other', 'minor', 'Paul writes from Roman imprisonment on the cosmic scope of God''s plan — the church as the body of Christ, spiritual blessings, and the armor of God.', 'First Roman imprisonment, c. AD 60-62. One of the "Prison Epistles."', 992),
('Colossians Written',       60, NULL, 1, 1, 'possible', 'other', 'minor', 'Paul writes from prison to Colossae affirming Christ''s supremacy over all creation and warning against false philosophy — "in him the whole fullness of deity dwells bodily."', 'First Roman imprisonment, c. AD 60-62. Sent with Tychicus and Onesimus.', 993),
('Philemon Written',         60, NULL, 1, 1, 'possible', 'other', 'minor', 'Paul writes a brief personal letter from prison urging Philemon to receive his runaway slave Onesimus back as a brother in Christ — a window into early Christian social ethics.', 'First Roman imprisonment, c. AD 60-62. Sent with Colossians.', 994),
('Philippians Written',      61, NULL, 1, 1, 'probable', 'other', 'minor', 'Paul writes his letter of joy from prison to his most supportive church — including the great Christ-hymn (2:5-11) and "I can do all things through him who strengthens me."', 'First Roman imprisonment, c. AD 61-62.', 995),
('Acts Written',             62, NULL, 1, 1, 'possible', 'other', 'minor', 'Luke composes Acts as the sequel to his Gospel, tracing the spread of the church from Jerusalem to Rome — ending abruptly with Paul under house arrest.', 'The abrupt ending suggests composition c. AD 62, before Paul''s trial outcome was known.', 996),
('1 Timothy Written',        64, NULL, 1, 1, 'possible', 'other', 'minor', 'Paul writes to his young protégé Timothy at Ephesus with instructions on church leadership, false teaching, and godly conduct — "fight the good fight of the faith."', 'After Paul''s release from first Roman imprisonment, c. AD 63-65.', 997),
('Titus Written',            64, NULL, 1, 1, 'possible', 'other', 'minor', 'Paul writes to Titus on Crete with instructions for appointing elders and promoting sound doctrine — "the grace of God has appeared, bringing salvation for all people."', 'After Paul''s release from first Roman imprisonment, c. AD 63-65.', 998),
('1 Peter Written',          64, NULL, 1, 1, 'possible', 'other', 'minor', 'Peter writes from Rome (called "Babylon") to persecuted Christians scattered across Asia Minor, encouraging them to stand firm — "you are a chosen race, a royal priesthood."', 'Written from Rome, c. AD 62-64, before the Neronian persecution.', 999),
('Jude Written',             65, NULL, 1, 1, 'possible', 'other', 'minor', 'Jude, brother of Jesus, writes a brief, urgent letter warning against false teachers who have infiltrated the church — "contend for the faith once delivered to the saints."', 'Dated AD 65-80. Written before 2 Peter, which draws on it.', 1001),
('Hebrews Written',          67, NULL, 1, 1, 'traditional', 'other', 'minor', 'An unknown author writes this sophisticated argument for Christ''s superiority over angels, Moses, and the Levitical priesthood — "Jesus Christ is the same yesterday, today, and forever."', 'Author unknown. Pauline authorship debated since antiquity. Written before the destruction of the Temple (AD 70), likely from Rome.', 1002),
('2 Timothy Written',        67, NULL, 1, 1, 'probable', 'other', 'minor', 'Paul writes his final letter from a Roman dungeon to Timothy — a deeply personal farewell: "I have fought the good fight, I have finished the race, I have kept the faith."', 'Paul''s second Roman imprisonment, c. AD 66-67. His last known letter before execution.', 1003),
('2 Peter Written',          67, NULL, 1, 1, 'possible', 'other', 'minor', 'Peter writes his final letter shortly before his martyrdom, warning against false teachers and affirming the certainty of Christ''s return — "with the Lord one day is as a thousand years."', 'Written from Rome, c. AD 65-68, shortly before Peter''s death.', 1004),
('John Written',             85, NULL, 1, 1, 'traditional', 'other', 'minor', 'The apostle John composes his Gospel in Ephesus — a theological masterpiece opening with "In the beginning was the Word," presenting Jesus as the divine Son of God.', 'Traditional date: AD 85-95. Written in Ephesus. Last Gospel composed, supplementing the Synoptics.', 1005),
('1 John Written',           90, NULL, 1, 1, 'traditional', 'other', 'minor', 'John writes his first epistle from Ephesus, countering early Gnostic-like heresies and declaring that "God is light" and "God is love."', 'Dated AD 85-95. Written from Ephesus to churches in Asia Minor.', 1006),
('2 John Written',           90, NULL, 1, 1, 'traditional', 'other', 'minor', 'John writes a brief letter to "the elect lady and her children" — a local church — warning against false teachers who deny Christ came in the flesh.', 'Dated AD 85-95. Written from Ephesus.', 1007),
('3 John Written',           90, NULL, 1, 1, 'traditional', 'other', 'minor', 'John writes to Gaius commending his hospitality to traveling missionaries and rebuking Diotrephes, who "likes to put himself first."', 'Dated AD 85-95. Written from Ephesus.', 1008);

-- ============================================================
-- BIBLICAL BOOKS
-- ============================================================
INSERT INTO biblical_books (name, abbreviation, testament, genre, approx_writing_year, period_covered_start, period_covered_end) VALUES
('Genesis',        'Gen',   'OT', 'law',       -1491, -4004, -1706),
('Exodus',         'Exod',  'OT', 'law',       -1491, -1571, -1451),
('Leviticus',      'Lev',   'OT', 'law',       -1491, -1491, -1490),
('Numbers',        'Num',   'OT', 'law',       -1491, -1491, -1451),
('Deuteronomy',    'Deut',  'OT', 'law',       -1451, -1451, -1451),
('Joshua',         'Josh',  'OT', 'history',   -1420, -1451, -1420),
('Judges',         'Judg',  'OT', 'history',   -1095, -1420, -1095),
('Ruth',           'Ruth',  'OT', 'history',   -1095, -1195, -1145),
('1 Samuel',       '1 Sam', 'OT', 'history',    -975, -1150, -1056),
('2 Samuel',       '2 Sam', 'OT', 'history',    -975, -1055, -1015),
('1 Kings',        '1 Kgs', 'OT', 'history',    -560, -1015,  -853),
('2 Kings',        '2 Kgs', 'OT', 'history',    -560,  -853,  -586),
('1 Chronicles',   '1 Chr', 'OT', 'history',    -450, -4004, -1015),
('2 Chronicles',   '2 Chr', 'OT', 'history',    -450, -1015,  -586),
('Ezra',           'Ezra',  'OT', 'history',    -440,  -538,  -458),
('Nehemiah',       'Neh',   'OT', 'history',    -430,  -445,  -430),
('Esther',         'Esth',  'OT', 'history',    -470,  -486,  -465),
('Job',            'Job',   'OT', 'wisdom',    -2000, -2000, -2000),
('Psalms',         'Ps',    'OT', 'wisdom',    -1015, -1491,  -450),
('Proverbs',       'Prov',  'OT', 'wisdom',     -995, -1015,  -700),
('Ecclesiastes',   'Eccl',  'OT', 'wisdom',     -985, -1015,  -975),
('Song of Solomon','Song',  'OT', 'wisdom',    -1005, -1015,  -975),
('Isaiah',         'Isa',   'OT', 'prophecy',   -700,  -740,  -680),
('Jeremiah',       'Jer',   'OT', 'prophecy',   -586,  -627,  -586),
('Lamentations',   'Lam',   'OT', 'prophecy',   -586,  -586,  -586),
('Ezekiel',        'Ezek',  'OT', 'prophecy',   -570,  -593,  -571),
('Daniel',         'Dan',   'OT', 'prophecy',   -536,  -605,  -536),
('Hosea',          'Hos',   'OT', 'prophecy',   -725,  -755,  -725),
('Joel',           'Joel',  'OT', 'prophecy',   -835,  -835,  -835),
('Amos',           'Amos',  'OT', 'prophecy',   -760,  -760,  -760),
('Obadiah',        'Obad',  'OT', 'prophecy',   -586,  -586,  -586),
('Jonah',          'Jonah', 'OT', 'prophecy',   -760,  -760,  -760),
('Micah',          'Mic',   'OT', 'prophecy',   -700,  -735,  -700),
('Nahum',          'Nah',   'OT', 'prophecy',   -660,  -660,  -660),
('Habakkuk',       'Hab',   'OT', 'prophecy',   -607,  -607,  -607),
('Zephaniah',      'Zeph',  'OT', 'prophecy',   -625,  -625,  -625),
('Haggai',         'Hag',   'OT', 'prophecy',   -520,  -520,  -520),
('Zechariah',      'Zech',  'OT', 'prophecy',   -520,  -520,  -480),
('Malachi',        'Mal',   'OT', 'prophecy',   -430,  -430,  -430),
('Matthew',        'Matt',  'NT', 'gospel',       55,    -5,    33),
('Mark',           'Mark',  'NT', 'gospel',       55,    26,    33),
('Luke',           'Luke',  'NT', 'gospel',       60,    -5,    33),
('John',           'John',  'NT', 'gospel',       85,    -5,    33),
('Acts',           'Acts',  'NT', 'history',      62,    33,    62),
('Romans',         'Rom',   'NT', 'epistle',      57,    57,    57),
('1 Corinthians',  '1 Cor', 'NT', 'epistle',      55,    55,    55),
('2 Corinthians',  '2 Cor', 'NT', 'epistle',      56,    56,    56),
('Galatians',      'Gal',   'NT', 'epistle',      49,    49,    49),
('Ephesians',      'Eph',   'NT', 'epistle',      60,    60,    60),
('Philippians',    'Phil',  'NT', 'epistle',      61,    61,    61),
('Colossians',     'Col',   'NT', 'epistle',      60,    60,    60),
('1 Thessalonians','1 Thess','NT','epistle',       51,    51,    51),
('2 Thessalonians','2 Thess','NT','epistle',       51,    51,    51),
('1 Timothy',      '1 Tim', 'NT', 'epistle',      64,    64,    64),
('2 Timothy',      '2 Tim', 'NT', 'epistle',      67,    67,    67),
('Titus',          'Titus', 'NT', 'epistle',      64,    64,    64),
('Philemon',       'Phlm',  'NT', 'epistle',      60,    60,    60),
('Hebrews',        'Heb',   'NT', 'epistle',      67,    67,    67),
('James',          'Jas',   'NT', 'epistle',      49,    49,    49),
('1 Peter',        '1 Pet', 'NT', 'epistle',      64,    64,    64),
('2 Peter',        '2 Pet', 'NT', 'epistle',      67,    67,    67),
('1 John',         '1 John','NT', 'epistle',      90,    90,    90),
('2 John',         '2 John','NT', 'epistle',      90,    90,    90),
('3 John',         '3 John','NT', 'epistle',      90,    90,    90),
('Jude',           'Jude',  'NT', 'epistle',      65,    65,    65),
('Revelation',     'Rev',   'NT', 'apocalyptic',  95,    95,    95);

-- ============================================================
-- LOCATIONS
-- ============================================================
INSERT INTO locations (name, modern_name, latitude, longitude, region, description) VALUES
('Eden',        NULL,           NULL,    NULL,    'Mesopotamia', 'Garden where God placed Adam and Eve.'),
('Ur',          'Tell el-Muqayyar', 30.96, 46.10, 'Mesopotamia', 'Birthplace of Abraham in southern Mesopotamia.'),
('Haran',       'Harran',       36.86, 39.03, 'Mesopotamia', 'Where Abraham''s family settled before Canaan.'),
('Canaan',      'Israel/Palestine', 31.77, 35.23, 'Levant', 'The Promised Land.'),
('Egypt',       'Egypt',        26.82, 30.80, 'North Africa', 'Where Israel was enslaved for ~400 years.'),
('Mount Sinai', 'Jebel Musa',   28.54, 33.97, 'Sinai Peninsula', 'Where God gave Moses the Law.'),
('Jerusalem',   'Jerusalem',    31.77, 35.23, 'Judah', 'City of David; location of the Temple.'),
('Bethlehem',   'Bethlehem',    31.70, 35.21, 'Judah', 'Birthplace of David and Jesus.'),
('Babylon',     'Hillah, Iraq', 32.54, 44.42, 'Mesopotamia', 'Capital of Babylonian Empire; place of exile.'),
('Nazareth',    'Nazareth',     32.70, 35.30, 'Galilee', 'Hometown of Jesus.'),
('Capernaum',   'Kfar Nahum',   32.8831, 35.5747, 'Galilee', 'Base of Jesus'' Galilean ministry.'),
('Damascus',    'Damascus',     33.51, 36.29, 'Syria', 'Where Paul was converted.'),
('Antioch',     'Antakya',      36.20, 36.16, 'Syria', 'Center of early Gentile Christianity.'),
('Rome',        'Rome',         41.90, 12.50, 'Italy', 'Capital of the Roman Empire; center of early church.'),
('Patmos',      'Patmos',       37.32, 26.55, 'Aegean Sea', 'Island where John wrote Revelation.'),
('Cana',        'Kafr Kanna',   32.75, 35.34, 'Galilee', 'Village where Jesus turned water into wine.'),
('Sea of Galilee','Lake Tiberias',32.83,35.58, 'Galilee', 'Lake where Jesus calmed the storm and walked on water.'),
('Bethsaida',   'Et-Tell',      32.91, 35.63, 'Galilee', 'Fishing village; home of Peter, Andrew, and Philip.'),
('Nain',        'Nein',         32.63, 35.35, 'Galilee', 'Village where Jesus raised the widow''s son.'),
('Bethany',     'Al-Eizariya',  31.77, 35.26, 'Judea', 'Village near Jerusalem; home of Mary, Martha, and Lazarus.'),
('Gadara',      'Umm Qais',     32.66, 35.68, 'Decapolis', 'Region where Jesus healed the demon-possessed man.'),
('Jericho',     'Jericho',      31.87, 35.44, 'Judea', 'Ancient city near the Jordan; site of Bartimaeus'' healing.'),
('Tyre & Sidon','Tyre/Saida',   33.27, 35.20, 'Phoenicia', 'Coastal cities where Jesus healed the Syrophoenician woman''s daughter.'),
('Decapolis',   NULL,           32.60, 35.80, 'Transjordan', 'League of ten Greco-Roman cities east of the Jordan.'),
('Jordan River', NULL,          31.76, 35.56, 'Judea', 'River where Naaman was healed and Jesus was baptized.'),
-- Acts-journey locations (IDs 26-42)
('Samaria',     'Sebastia',     32.28, 35.19, 'Samaria', 'Philip preached and performed miracles here (Acts 8).'),
('Gaza Road',   NULL,           31.50, 34.47, 'Judea', 'Desert road where Philip baptized the Ethiopian eunuch (Acts 8:26).'),
('Joppa',       'Jaffa/Tel Aviv',31.75,34.75, 'Judea', 'Where Peter raised Tabitha and had the vision of the sheet (Acts 9-10).'),
('Caesarea',    'Caesarea',     32.50, 34.89, 'Judea', 'Roman capital of Judea; house of Cornelius; Paul''s imprisonment (Acts 10, 23-26).'),
('Cyprus',      'Cyprus',       34.92, 33.63, 'Mediterranean', 'Home of Barnabas; first stop on Paul''s first journey (Acts 13:4-12).'),
('Pisidian Antioch','Yalvaç',   38.30, 31.18, 'Asia Minor', 'Paul preached in the synagogue; many believed (Acts 13:14-52).'),
('Iconium',     'Konya',        37.87, 32.49, 'Asia Minor', 'Paul and Barnabas preached but were driven out (Acts 14:1-7).'),
('Lystra',      'Hatunsaray',   37.57, 32.36, 'Asia Minor', 'Paul healed a lame man; later stoned (Acts 14:8-20).'),
('Derbe',       'Kerti Höyük',  37.36, 33.35, 'Asia Minor', 'Paul and Barnabas made many disciples (Acts 14:20-21).'),
('Troas',       'Dalyan',       39.76, 26.18, 'Asia Minor', 'Paul received the Macedonian vision (Acts 16:8-10).'),
('Philippi',    'Kavala region',41.01, 24.29, 'Macedonia', 'First European church; Lydia converted; Paul imprisoned (Acts 16:11-40).'),
('Thessalonica','Thessaloniki', 40.63, 22.95, 'Macedonia', 'Paul preached in synagogue; accused of sedition (Acts 17:1-9).'),
('Berea',       'Veria',        40.52, 22.20, 'Macedonia', 'Bereans examined Scriptures daily to verify Paul''s teaching (Acts 17:10-15).'),
('Athens',      'Athens',       37.97, 23.73, 'Greece', 'Paul preached on the Areopagus about the Unknown God (Acts 17:16-34).'),
('Corinth',     'Ancient Corinth',37.91,22.88,'Greece', 'Paul stayed 18 months; Gallio tribunal (Acts 18:1-17).'),
('Ephesus',     'Selçuk',       37.94, 27.34, 'Asia Minor', 'Paul taught 2 years; riot of Demetrius the silversmith (Acts 19).'),
('Miletus',     'Balat',        37.53, 27.28, 'Asia Minor', 'Paul''s farewell to Ephesian elders (Acts 20:17-38).'),
('Crete',       'Crete',        35.24, 24.90, 'Mediterranean', 'Paul''s ship stopped at Fair Havens (Acts 27:7-12).'),
('Malta',       'Malta',        35.94, 14.38, 'Mediterranean', 'Paul shipwrecked; healed the sick (Acts 27:39–28:10).'),
('Puteoli',     'Pozzuoli',     40.82, 14.12, 'Italy', 'Port where Paul landed in Italy (Acts 28:13).'),
-- Genesis / Exodus / Luke / Jonah journey locations (IDs 46-57)
('Shechem',     'Nablus',       32.21, 35.28, 'Samaria', 'Abraham built an altar here; Jacob bought land. First stop in Canaan.'),
('Hebron',      'Al-Khalil',    31.53, 35.10, 'Judah', 'Abraham settled at the oaks of Mamre; burial site of the patriarchs.'),
('Beersheba',   'Be''er Sheva', 31.25, 34.79, 'Negev', 'Well of the oath between Abraham and Abimelech; Isaac and Jacob lived here.'),
('Goshen',      'Wadi Tumilat', 30.55, 31.80, 'Egypt', 'Region in eastern Egypt where Israel settled (Gen 45-47).'),
('Peniel',      'Tulul ed-Dhahab',32.19,35.66,'Transjordan', 'Where Jacob wrestled with God and was renamed Israel (Gen 32:22-32).'),
('Red Sea Crossing','Nuweiba',  29.03, 34.66, 'Sinai', 'Traditional and alternative sites for Israel''s crossing of the sea.'),
('Marah',       'Ain Hawarah',  29.18, 33.11, 'Sinai', 'Bitter waters made sweet by Moses (Exod 15:23-25).'),
('Elim',        'Wadi Gharandel',28.98,33.10, 'Sinai', 'Oasis with twelve springs and seventy palm trees (Exod 15:27).'),
('Rephidim',    'Wadi Feiran',  28.70, 33.63, 'Sinai', 'Water from the rock; battle with Amalek (Exod 17).'),
('Kadesh Barnea','Ein el-Qudeirat',30.60,34.40,'Negev', 'Israel camped before entering Canaan; spies sent out (Num 13-14).'),
('Nineveh',     'Mosul, Iraq',  36.36, 43.15, 'Mesopotamia', 'Capital of Assyria where Jonah preached repentance.'),
('Emmaus',      'Emmaus Nicopolis',31.84,34.99,'Judea', 'Village where the risen Jesus appeared to two disciples (Luke 24:13-35).'),
-- Church History Locations (IDs 58–80)
('Constantinople','Istanbul, Turkey',41.01,28.98,'Asia Minor', 'Capital of the Eastern Roman Empire; seat of ecumenical patriarchate.'),
('Carthage',    'Tunis, Tunisia',   36.86,10.32,'North Africa', 'Important early church center; home of Tertullian, Cyprian, and Augustine.'),
('Hippo Regius','Annaba, Algeria',  36.90, 7.77,'North Africa', 'Bishopric of Augustine of Hippo.'),
('Nicaea',      'İznik, Turkey',    40.43,29.72,'Asia Minor', 'Site of the First Ecumenical Council (325 AD).'),
('Chalcedon',   'Kadıköy, Istanbul',40.98,29.03,'Asia Minor', 'Site of the Council of Chalcedon (451 AD).'),
('Wittenberg',  'Wittenberg, Germany',51.87,12.65,'Europe', 'Where Martin Luther posted the 95 Theses (1517).'),
('Geneva',      'Geneva, Switzerland',46.20,6.15,'Europe', 'Center of John Calvin''s Reformed tradition.'),
('Mainz',       'Mainz, Germany',   50.00, 8.27,'Europe', 'Gutenberg''s city; birthplace of the printing press.'),
('Canterbury',  'Canterbury, England',51.28,1.08,'Europe', 'Seat of the Archbishop of Canterbury; English Christianity.'),
('Worms',       'Worms, Germany',   49.63, 8.37,'Europe', 'Diet of Worms (1521); Luther''s "Here I stand."'),
('Trent',       'Trento, Italy',    46.07,11.12,'Europe', 'Council of Trent (1545–1563); Catholic Counter-Reformation.'),
('Aldersgate',  'London, England',  51.52,-0.10,'Europe', 'Site of John Wesley''s evangelical conversion (1738).'),
('Edinburgh',   'Edinburgh, Scotland',55.95,-3.19,'Europe', 'Edinburgh Missionary Conference (1910).'),
('Azusa Street','Los Angeles, USA', 34.05,-118.25,'Americas', 'Azusa Street Revival (1906); birth of Pentecostalism.'),
('Serampore',   'Serampore, India', 22.75,88.34,'Asia', 'William Carey''s mission base; Bible translation center.'),
('Qumran',      'Qumran, Israel',   31.74,35.46,'Judea', 'Site where the Dead Sea Scrolls were discovered (1947).'),
('Northampton', 'Northampton, MA, USA',42.33,-72.63,'Americas', 'Jonathan Edwards and the First Great Awakening.'),
('Assisi',      'Assisi, Italy',    43.07,12.62,'Europe', 'Home of Francis of Assisi.'),
('Nuremberg',   'Nuremberg, Germany',49.45,11.08,'Europe', 'Center of Reformation-era publishing and reform.'),
('Whitby',      'Whitby, England',  54.49,-0.62,'Europe', 'Synod of Whitby (664); Celtic vs. Roman church.'),
('Clermont',    'Clermont-Ferrand, France',45.78,3.08,'Europe', 'Council of Clermont (1095); Pope Urban II calls the First Crusade.'),
('Wycliffe Country','Lutterworth, England',52.46,-1.20,'Europe', 'Home of John Wycliffe; Morning Star of the Reformation.');

-- ============================================================
-- PERSON-EVENT RELATIONSHIPS
-- ============================================================
INSERT INTO person_events (person_id, event_id, role_in_event) VALUES
-- Adam & Eve
(1, 1, 'participant'), (1, 2, 'participant'),
(2, 1, 'participant'), (2, 2, 'participant'),
-- Noah
(3, 3, 'protagonist'),
-- Abraham
(4, 5, 'protagonist'), (4, 6, 'participant'), (4, 7, 'protagonist'),
-- Jacob
(8, 10, 'protagonist'),
-- Joseph
(9, 11, 'protagonist'), (9, 12, 'catalyst'),
-- Moses
(10, 14, 'protagonist'), (10, 15, 'leader'), (10, 16, 'recipient'), (10, 17, 'leader'),
-- Aaron
(11, 14, 'participant'), (11, 16, 'participant'),
-- Joshua
(13, 19, 'protagonist'), (13, 20, 'leader'),
-- Deborah
(14, 22, 'protagonist'),
-- Gideon
(15, 23, 'protagonist'),
-- Samuel
(18, 25, 'protagonist'),
-- Saul
(19, 25, 'participant'),
-- David
(20, 26, 'protagonist'), (20, 27, 'protagonist'), (20, 28, 'recipient'),
-- Solomon
(21, 29, 'protagonist'),
-- Elijah
(23, 31, 'protagonist'),
-- Hezekiah
(29, 33, 'protagonist'),
-- Josiah
(30, 34, 'protagonist'),
-- Jeremiah
(26, 35, 'witness'),
-- Ezekiel
(27, 36, 'participant'),
-- Daniel
(28, 36, 'participant'),
-- Ezra
(33, 39, 'protagonist'),
-- Nehemiah
(34, 40, 'protagonist'),
-- Esther
(36, 41, 'protagonist'),
-- Jesus (Birth, Baptism, Sermon, Crucifixion, Resurrection, Ascension)
(37, 42, 'protagonist'), (37, 43, 'protagonist'), (37, 44, 'teacher'),
(37, 45, 'protagonist'), (37, 46, 'protagonist'), (37, 47, 'protagonist'),
-- Ascension witnesses
(40, 47, 'witness'), (42, 47, 'witness'),
-- Jesus miracles (events 58-93)
(37, 58, 'protagonist'), (37, 59, 'protagonist'), (37, 60, 'protagonist'),
(37, 61, 'protagonist'), (37, 62, 'protagonist'), (37, 63, 'protagonist'),
(37, 64, 'protagonist'), (37, 65, 'protagonist'), (37, 66, 'protagonist'),
(37, 67, 'protagonist'), (37, 68, 'protagonist'), (37, 69, 'protagonist'),
(37, 70, 'protagonist'), (37, 71, 'protagonist'), (37, 72, 'protagonist'),
(37, 73, 'protagonist'), (37, 74, 'protagonist'), (37, 75, 'protagonist'),
(37, 76, 'protagonist'), (37, 77, 'protagonist'), (37, 78, 'protagonist'),
(37, 79, 'protagonist'), (37, 80, 'protagonist'), (37, 81, 'protagonist'),
(37, 82, 'protagonist'), (37, 83, 'protagonist'), (37, 84, 'protagonist'),
(37, 85, 'protagonist'), (37, 86, 'protagonist'), (37, 87, 'protagonist'),
(37, 88, 'protagonist'), (37, 89, 'protagonist'), (37, 90, 'protagonist'),
(37, 91, 'protagonist'), (37, 92, 'protagonist'), (37, 93, 'protagonist'),
-- Peter in miracles
(40, 60, 'participant'), -- Great Catch of Fish
(40, 62, 'participant'), -- Peter's mother-in-law
(40, 76, 'participant'), -- Walking on Water
(40, 83, 'participant'), -- Coin in Fish's Mouth
(40, 93, 'participant'), -- Catch of 153 Fish
-- Mary
(38, 42, 'participant'),
-- John the Baptist
(39, 43, 'officiant'),
-- Peter
(40, 48, 'preacher'), (40, 52, 'participant'),
-- Paul
(41, 50, 'protagonist'), (41, 51, 'protagonist'), (41, 52, 'participant'),
(41, 53, 'protagonist'), (41, 54, 'protagonist'),
-- Stephen
(44, 49, 'protagonist'),
-- John
(42, 56, 'author'),
-- Elisha heals Naaman
(24, 94, 'protagonist'),
(48, 94, 'protagonist'),
-- New people in events
(49, 1, 'participant'),   -- Seth in Creation (born after)
(3, 4, 'participant'),     -- Noah in Tower of Babel
(53, 4, 'participant'),    -- Shem in Tower of Babel
(54, 4, 'participant'),    -- Ham in Tower of Babel
(55, 4, 'participant'),    -- Japheth in Tower of Babel
(56, 5, 'participant'),    -- Lot in Call of Abraham (traveled with Abraham)
(57, 7, 'participant'),    -- Ishmael in Binding of Isaac (context)
(58, 5, 'participant'),    -- Hagar in Call of Abraham (Sarah's servant)
(59, 10, 'participant'),   -- Esau in Jacob Wrestles God (context)
(61, 13, 'participant'),   -- Leah in Israel Enters Egypt
(62, 11, 'participant'),   -- Rachel in Joseph Sold (died before Egypt)
(63, 13, 'participant'),   -- Judah in Israel Enters Egypt
(64, 13, 'participant'),   -- Benjamin in Israel Enters Egypt
(65, 11, 'participant'),   -- Reuben in Joseph Sold (tried to save him)
(66, 14, 'antagonist'),    -- Pharaoh in The Exodus
(66, 15, 'antagonist'),    -- Pharaoh in Crossing the Red Sea
(67, 17, 'participant'),   -- Caleb in Wilderness Wandering
(67, 19, 'participant'),   -- Caleb in Conquest of Canaan
(70, 14, 'participant'),   -- Zipporah in The Exodus
(69, 16, 'participant'),   -- Jethro in Giving of the Law (advised Moses)
(71, 21, 'protagonist'),   -- Othniel in Period of Judges
(72, 21, 'protagonist'),   -- Ehud in Period of Judges
(73, 21, 'protagonist'),   -- Jephthah in Period of Judges
(74, 21, 'participant'),   -- Eli in Period of Judges
(76, 21, 'participant'),   -- Boaz in Period of Judges
(78, 21, 'participant'),   -- Abimelech in Period of Judges
(81, 26, 'participant'),   -- Joab in David Anointed King
(81, 27, 'participant'),   -- Joab in David Captures Jerusalem
(83, 25, 'participant'),   -- Jonathan in Saul Anointed King
(84, 25, 'participant'),   -- Michal in Saul Anointed King (context)
(80, 28, 'participant'),   -- Bathsheba in Davidic Covenant (context)
(85, 30, 'protagonist'),   -- Rehoboam in Kingdom Divides
(31, 30, 'protagonist'),   -- Jeroboam I in Kingdom Divides
(107, 31, 'antagonist'),   -- Jezebel in Elijah on Mount Carmel (context)
(103, 32, 'participant'),  -- Jehu killed kings of Israel
(91, 35, 'participant'),   -- Manasseh in Fall of Jerusalem (caused it, partially)
(92, 35, 'participant'),   -- Jehoiakim in Fall of Jerusalem
(93, 35, 'protagonist'),   -- Zedekiah in Fall of Jerusalem (last king)
(120, 41, 'participant'),  -- Mordecai in Esther Saves Her People
(122, 42, 'participant'),  -- Joseph of Nazareth in Birth of Jesus
(145, 42, 'antagonist'),   -- Herod the Great in Birth of Jesus
(135, 45, 'participant'),  -- Judas Iscariot in Crucifixion (betrayal)
(146, 45, 'protagonist'),  -- Pontius Pilate in Crucifixion
(147, 42, 'witness'),      -- Anna in Birth of Jesus (at Temple)
(125, 46, 'witness'),      -- Mary Magdalene in Resurrection
(126, 45, 'participant'),  -- Nicodemus in Crucifixion (burial)
(123, 86, 'protagonist'),  -- Lazarus in Raising of Lazarus
(124, 86, 'participant'),  -- Martha in Raising of Lazarus
(136, 48, 'participant'),  -- Matthias in Pentecost (was present)
(137, 51, 'participant'),  -- Mark in Paul's First Missionary Journey
(138, 53, 'participant'),  -- Silas in Paul's Second Missionary Journey
(142, 53, 'participant'),  -- Apollos in Paul's Second Missionary Journey (context)
-- Gen 11 ancestors in events
(155, 4, 'participant'),   -- Peleg in Tower of Babel (born when earth divided)
(159, 5, 'participant'),   -- Terah in Call of Abraham (Abraham left after Terah's death)
-- 100 Additional People in events
(160, 2, 'participant'),   -- Cain in The Fall (born after)
(161, 2, 'participant'),   -- Abel in The Fall (born after)
(162, 13, 'participant'),  -- Dinah in Israel Enters Egypt
(163, 13, 'participant'),  -- Simeon in Israel Enters Egypt
(164, 13, 'participant'),  -- Levi in Israel Enters Egypt
(182, 19, 'participant'),  -- Rahab in Conquest of Canaan
(183, 19, 'participant'),  -- Achan in Conquest of Canaan
(184, 17, 'participant'),  -- Eleazar in Wilderness Wandering
(184, 19, 'participant'),  -- Eleazar in Conquest of Canaan
(185, 14, 'participant'),  -- Hur in The Exodus
(189, 22, 'participant'),  -- Barak in Deborah's Victory
(190, 22, 'participant'),  -- Jael in Deborah's Victory
(191, 22, 'antagonist'),   -- Sisera in Deborah's Victory
(199, 26, 'antagonist'),   -- Ish-bosheth rival to David
(200, 26, 'participant'),  -- Abner in David Anointed
(208, 28, 'participant'),  -- Zadok in Davidic Covenant
(214, 35, 'antagonist'),   -- Nebuchadnezzar in Fall of Jerusalem
(214, 36, 'protagonist'),  -- Nebuchadnezzar in Babylonian Exile
(218, 36, 'participant'),  -- Shadrach in Babylonian Exile
(219, 36, 'participant'),  -- Meshach in Babylonian Exile
(220, 36, 'participant'),  -- Abednego in Babylonian Exile
(216, 37, 'protagonist'),  -- Cyrus in Edict of Cyrus
(226, 41, 'antagonist'),   -- Haman in Esther Saves Her People
(228, 41, 'participant'),  -- Xerxes in Esther Saves Her People
(229, 42, 'witness'),      -- Simeon at Temple in Birth of Jesus
(232, 43, 'antagonist'),   -- Herod Antipas in Baptism of Jesus (killed John)
(235, 45, 'antagonist'),   -- Caiaphas in Crucifixion
(236, 45, 'participant'),  -- Annas in Crucifixion
(237, 45, 'participant'),  -- Barabbas in Crucifixion
(238, 45, 'participant'),  -- Joseph of Arimathea in Crucifixion (burial)
(239, 45, 'participant'),  -- Simon of Cyrene in Crucifixion
(243, 86, 'participant'),  -- Mary of Bethany in Raising of Lazarus
(244, 50, 'participant'),  -- Ananias in Paul's Conversion
(245, 52, 'participant'),  -- Cornelius in Council of Jerusalem (context)
(254, 49, 'antagonist');   -- Herod Agrippa I in Stephen's Martyrdom (killed James)
-- Post-Resurrection appearances
INSERT INTO person_events (person_id, event_id, role_in_event) VALUES
(37, 143, 'protagonist'),  -- Jesus in Appearance to Mary Magdalene
(37, 144, 'protagonist'),  -- Jesus in Road to Emmaus
(37, 145, 'protagonist'),  -- Jesus in Appearance to Disciples
(37, 146, 'protagonist'),  -- Jesus in Appearance to Thomas
(37, 147, 'protagonist'),  -- Jesus in Restoration of Peter
(37, 148, 'protagonist'),  -- Jesus in Great Commission
(125, 143, 'witness'),     -- Mary Magdalene in Appearance to Mary Magdalene
(242, 144, 'participant'), -- Cleopas in Road to Emmaus
(40, 145, 'participant'),  -- Peter in Appearance to Disciples
(42, 145, 'participant'),  -- John in Appearance to Disciples
(131, 146, 'protagonist'), -- Thomas in Appearance to Thomas
(40, 146, 'participant'),  -- Peter in Appearance to Thomas
(40, 147, 'protagonist'),  -- Peter in Restoration of Peter
(42, 147, 'participant'),  -- John in Restoration of Peter
(40, 148, 'participant'),  -- Peter in Great Commission
(42, 148, 'participant');  -- John in Great Commission
-- NT Books Written — author links
INSERT INTO person_events (person_id, event_id, role_in_event) VALUES
(144, 149, 'author'),  -- James brother of Jesus → James Written
(41, 150, 'author'),   -- Paul → Galatians Written
(41, 151, 'author'),   -- Paul → 1 Thessalonians Written
(41, 152, 'author'),   -- Paul → 2 Thessalonians Written
(41, 153, 'author'),   -- Paul → 1 Corinthians Written
(127, 154, 'author'),  -- Matthew → Matthew Written
(137, 155, 'author'),  -- Mark → Mark Written
(41, 156, 'author'),   -- Paul → 2 Corinthians Written
(41, 157, 'author'),   -- Paul → Romans Written
(47, 158, 'author'),   -- Luke → Luke Written
(41, 159, 'author'),   -- Paul → Ephesians Written
(41, 160, 'author'),   -- Paul → Colossians Written
(41, 161, 'author'),   -- Paul → Philemon Written
(41, 162, 'author'),   -- Paul → Philippians Written
(47, 163, 'author'),   -- Luke → Acts Written
(41, 164, 'author'),   -- Paul → 1 Timothy Written
(41, 165, 'author'),   -- Paul → Titus Written
(40, 166, 'author'),   -- Peter → 1 Peter Written
(41, 169, 'author'),   -- Paul → 2 Timothy Written
(40, 170, 'author'),   -- Peter → 2 Peter Written
(42, 171, 'author'),   -- John → John Written
(42, 172, 'author'),   -- John → 1 John Written
(42, 173, 'author'),   -- John → 2 John Written
(42, 174, 'author');   -- John → 3 John Written

-- ============================================================
-- PERSON RELATIONSHIPS
-- ============================================================
INSERT INTO person_relationships (person_id_1, person_id_2, relationship_type) VALUES
(4, 5, 'spouse'),   (5, 4, 'spouse'),
(4, 6, 'parent'),   (6, 4, 'child'),
(6, 7, 'spouse'),   (7, 6, 'spouse'),
(6, 8, 'parent'),   (8, 6, 'child'),
(8, 9, 'parent'),   (9, 8, 'child'),
(10, 11, 'sibling'), (11, 10, 'sibling'),
(10, 12, 'sibling'), (12, 10, 'sibling'),
(10, 13, 'mentor'),  (13, 10, 'successor'),
(18, 19, 'mentor'),  -- Samuel anointed Saul
(18, 20, 'mentor'),  -- Samuel anointed David
(23, 24, 'mentor'),  (24, 23, 'successor'), -- Elijah/Elisha
(20, 21, 'parent'),  (21, 20, 'child'),     -- David/Solomon
(38, 37, 'parent'),  -- Mary → Jesus
(41, 46, 'mentor'),  -- Paul → Timothy
-- New person relationships
(1, 49, 'parent'),   (49, 1, 'child'),     -- Adam → Seth
(2, 49, 'parent'),   (49, 2, 'child'),     -- Eve → Seth
(1, 2, 'spouse'),    (2, 1, 'spouse'),     -- Adam & Eve
(50, 51, 'parent'),  (51, 50, 'child'),    -- Enoch → Methuselah
(51, 52, 'parent'),  (52, 51, 'child'),    -- Methuselah → Lamech
(52, 3, 'parent'),   (3, 52, 'child'),     -- Lamech → Noah
(3, 53, 'parent'),   (53, 3, 'child'),     -- Noah → Shem
(3, 54, 'parent'),   (54, 3, 'child'),     -- Noah → Ham
(3, 55, 'parent'),   (55, 3, 'child'),     -- Noah → Japheth
(53, 54, 'sibling'), (54, 53, 'sibling'),  -- Shem & Ham
(53, 55, 'sibling'), (55, 53, 'sibling'),  -- Shem & Japheth
(54, 55, 'sibling'), (55, 54, 'sibling'),  -- Ham & Japheth
(4, 57, 'parent'),   (57, 4, 'child'),     -- Abraham → Ishmael
(58, 57, 'parent'),  (57, 58, 'child'),    -- Hagar → Ishmael
(4, 58, 'contemporary'),                   -- Abraham & Hagar (master/servant)
(5, 58, 'contemporary'),                   -- Sarah & Hagar
(6, 59, 'parent'),   (59, 6, 'child'),     -- Isaac → Esau
(7, 59, 'parent'),   (59, 7, 'child'),     -- Rebekah → Esau
(8, 59, 'sibling'),  (59, 8, 'sibling'),   -- Jacob & Esau twins
(7, 60, 'sibling'),  (60, 7, 'sibling'),   -- Rebekah & Laban siblings
(60, 61, 'parent'),  (61, 60, 'child'),    -- Laban → Leah
(60, 62, 'parent'),  (62, 60, 'child'),    -- Laban → Rachel
(8, 61, 'spouse'),   (61, 8, 'spouse'),    -- Jacob & Leah
(8, 62, 'spouse'),   (62, 8, 'spouse'),    -- Jacob & Rachel
(61, 62, 'sibling'), (62, 61, 'sibling'),  -- Leah & Rachel
(8, 63, 'parent'),   (63, 8, 'child'),     -- Jacob → Judah
(61, 63, 'parent'),  (63, 61, 'child'),    -- Leah → Judah
(8, 64, 'parent'),   (64, 8, 'child'),     -- Jacob → Benjamin
(62, 64, 'parent'),  (64, 62, 'child'),    -- Rachel → Benjamin
(8, 65, 'parent'),   (65, 8, 'child'),     -- Jacob → Reuben
(61, 65, 'parent'),  (65, 61, 'child'),    -- Leah → Reuben
(62, 9, 'parent'),   (9, 62, 'child'),     -- Rachel → Joseph (mother)
(63, 64, 'sibling'), (64, 63, 'sibling'),  -- Judah & Benjamin half-brothers
(63, 65, 'sibling'), (65, 63, 'sibling'),  -- Judah & Reuben brothers
(64, 9, 'sibling'),  (9, 64, 'sibling'),   -- Benjamin & Joseph brothers
(69, 70, 'parent'),  (70, 69, 'child'),    -- Jethro → Zipporah
(10, 70, 'spouse'),  (70, 10, 'spouse'),   -- Moses & Zipporah
(75, 18, 'parent'),  (18, 75, 'child'),    -- Hannah → Samuel
(76, 17, 'spouse'),  (17, 76, 'spouse'),   -- Boaz & Ruth
(17, 77, 'contemporary'),                  -- Ruth & Naomi (daughter-in-law/mother-in-law)
(15, 78, 'parent'),  (78, 15, 'child'),    -- Gideon → Abimelech
(20, 79, 'spouse'),  (79, 20, 'spouse'),   -- David & Abigail
(20, 80, 'spouse'),  (80, 20, 'spouse'),   -- David & Bathsheba
(80, 21, 'parent'),  (21, 80, 'child'),    -- Bathsheba → Solomon (mother)
(20, 82, 'parent'),  (82, 20, 'child'),    -- David → Absalom
(19, 83, 'parent'),  (83, 19, 'child'),    -- Saul → Jonathan
(19, 84, 'parent'),  (84, 19, 'child'),    -- Saul → Michal
(20, 84, 'spouse'),  (84, 20, 'spouse'),   -- David & Michal
(20, 83, 'contemporary'),                  -- David & Jonathan (friends)
(83, 84, 'sibling'), (84, 83, 'sibling'),  -- Jonathan & Michal siblings
(21, 85, 'parent'),  (85, 21, 'child'),    -- Solomon → Rehoboam
(85, 86, 'parent'),  (86, 85, 'child'),    -- Rehoboam → Asa (via Abijah)
(86, 87, 'parent'),  (87, 86, 'child'),    -- Asa → Jehoshaphat
(87, 88, 'parent'),  (88, 87, 'child'),    -- Jehoshaphat → Jehoram of Judah
(90, 29, 'parent'),  (29, 90, 'child'),    -- Ahaz → Hezekiah
(29, 91, 'parent'),  (91, 29, 'child'),    -- Hezekiah → Manasseh
(30, 92, 'parent'),  (92, 30, 'child'),    -- Josiah → Jehoiakim
(30, 93, 'parent'),  (93, 30, 'child'),    -- Josiah → Zedekiah
(92, 93, 'sibling'), (93, 92, 'sibling'),  -- Jehoiakim & Zedekiah siblings
(95, 96, 'parent'),  (96, 95, 'child'),    -- Joash → Amaziah
(96, 89, 'parent'),  (89, 96, 'child'),    -- Amaziah → Uzziah
(89, 97, 'parent'),  (97, 89, 'child'),    -- Uzziah → Jotham
(97, 90, 'parent'),  (90, 97, 'child'),    -- Jotham → Ahaz
(31, 98, 'parent'),  (98, 31, 'child'),    -- Jeroboam I → Nadab
(100, 32, 'parent'), (32, 100, 'child'),   -- Omri → Ahab
(32, 107, 'spouse'), (107, 32, 'spouse'),  -- Ahab & Jezebel
(32, 101, 'parent'), (101, 32, 'child'),   -- Ahab → Ahaziah of Israel
(32, 102, 'parent'), (102, 32, 'child'),   -- Ahab → Jehoram of Israel
(107, 101, 'parent'),(101, 107, 'child'),  -- Jezebel → Ahaziah of Israel
(107, 102, 'parent'),(102, 107, 'child'),  -- Jezebel → Jehoram of Israel
(101, 102, 'sibling'),(102, 101, 'sibling'), -- Ahaziah & Jehoram siblings
(36, 120, 'contemporary'),                 -- Esther & Mordecai (cousins)
(122, 37, 'parent'), (37, 122, 'child'),   -- Joseph of Nazareth → Jesus
(122, 38, 'spouse'), (38, 122, 'spouse'),  -- Joseph & Mary
(122, 144, 'parent'),(144, 122, 'child'),  -- Joseph → James brother of Jesus
(38, 144, 'parent'), (144, 38, 'child'),   -- Mary → James brother of Jesus
(37, 144, 'sibling'),(144, 37, 'sibling'), -- Jesus & James siblings
(123, 124, 'sibling'),(124, 123, 'sibling'), -- Lazarus & Martha
(42, 43, 'sibling'), (43, 42, 'sibling'),  -- John & James sons of Zebedee
(128, 40, 'sibling'),(40, 128, 'sibling'), -- Andrew & Peter brothers
(140, 141, 'spouse'),(141, 140, 'spouse'), -- Priscilla & Aquila
(41, 138, 'contemporary'),                 -- Paul & Silas (co-workers)
(41, 139, 'mentor'), (139, 41, 'child'),   -- Paul → Titus (mentor)
(41, 137, 'contemporary'),                 -- Paul & Mark
(41, 45, 'contemporary'),                  -- Paul & Barnabas (already linked)
-- Gen 5 ancestor relationships
(49, 148, 'parent'),  (148, 49, 'child'),   -- Seth → Enosh
(148, 149, 'parent'), (149, 148, 'child'),  -- Enosh → Kenan
(149, 150, 'parent'), (150, 149, 'child'),  -- Kenan → Mahalalel
(150, 151, 'parent'), (151, 150, 'child'),  -- Mahalalel → Jared
(151, 50, 'parent'),  (50, 151, 'child'),   -- Jared → Enoch
-- Gen 11 ancestor relationships
(53, 152, 'parent'),  (152, 53, 'child'),   -- Shem → Arphaxad
(152, 153, 'parent'), (153, 152, 'child'),  -- Arphaxad → Salah
(153, 154, 'parent'), (154, 153, 'child'),  -- Salah → Eber
(154, 155, 'parent'), (155, 154, 'child'),  -- Eber → Peleg
(155, 156, 'parent'), (156, 155, 'child'),  -- Peleg → Reu
(156, 157, 'parent'), (157, 156, 'child'),  -- Reu → Serug
(157, 158, 'parent'), (158, 157, 'child'),  -- Serug → Nahor
(158, 159, 'parent'), (159, 158, 'child'),  -- Nahor → Terah
(159, 4, 'parent'),   (4, 159, 'child'),    -- Terah → Abraham
-- 100 Additional People relationships
(1, 160, 'parent'), (160, 1, 'child'),      -- Adam → Cain
(2, 160, 'parent'), (160, 2, 'child'),      -- Eve → Cain
(1, 161, 'parent'), (161, 1, 'child'),      -- Adam → Abel
(2, 161, 'parent'), (161, 2, 'child'),      -- Eve → Abel
(160, 161, 'sibling'), (161, 160, 'sibling'), -- Cain & Abel
(8, 162, 'parent'), (162, 8, 'child'),      -- Jacob → Dinah
(8, 163, 'parent'), (163, 8, 'child'),      -- Jacob → Simeon
(8, 164, 'parent'), (164, 8, 'child'),      -- Jacob → Levi
(8, 165, 'parent'), (165, 8, 'child'),      -- Jacob → Dan
(8, 166, 'parent'), (166, 8, 'child'),      -- Jacob → Naphtali
(8, 167, 'parent'), (167, 8, 'child'),      -- Jacob → Gad
(8, 168, 'parent'), (168, 8, 'child'),      -- Jacob → Asher
(8, 169, 'parent'), (169, 8, 'child'),      -- Jacob → Issachar
(8, 170, 'parent'), (170, 8, 'child'),      -- Jacob → Zebulun
(9, 171, 'parent'), (171, 9, 'child'),      -- Joseph → Manasseh
(9, 172, 'parent'), (172, 9, 'child'),      -- Joseph → Ephraim
(63, 174, 'parent'), (174, 63, 'child'),    -- Judah → Perez
(11, 184, 'parent'), (184, 11, 'child'),    -- Aaron → Eleazar
(184, 68, 'parent'), (68, 184, 'child'),    -- Eleazar → Phinehas
(192, 16, 'parent'), (16, 192, 'child'),    -- Manoah → Samson
(19, 199, 'parent'), (199, 19, 'child'),    -- Saul → Ish-bosheth
(83, 201, 'parent'), (201, 83, 'child'),    -- Jonathan → Mephibosheth
(20, 204, 'parent'), (204, 20, 'child'),    -- David → Adonijah
(202, 80, 'spouse'), (80, 202, 'spouse'),   -- Uriah & Bathsheba (first marriage)
(145, 232, 'parent'), (232, 145, 'child'),  -- Herod the Great → Herod Antipas
(230, 39, 'parent'), (39, 230, 'child'),    -- Zechariah → John the Baptist
(231, 39, 'parent'), (39, 231, 'child'),    -- Elizabeth → John the Baptist
(230, 231, 'spouse'), (231, 230, 'spouse'), -- Zechariah & Elizabeth
(232, 233, 'spouse'), (233, 232, 'spouse'), -- Herod Antipas & Herodias
(233, 234, 'parent'), (234, 233, 'child'),  -- Herodias → Salome
(235, 236, 'child'), (236, 235, 'parent'),  -- Caiaphas son-in-law of Annas
(123, 243, 'sibling'), (243, 123, 'sibling'), -- Lazarus & Mary of Bethany
(124, 243, 'sibling'), (243, 124, 'sibling'); -- Martha & Mary of Bethany

-- ============================================================
-- EVENT-LOCATION RELATIONSHIPS
-- ============================================================
INSERT INTO event_locations (event_id, location_id) VALUES
-- Original events (IDs from actual DB)
(5, 2),   -- Call of Abraham → Ur
(7, 7),   -- Binding of Isaac → Jerusalem (Moriah)
(13, 5),  -- Israel Enters Egypt → Egypt
(14, 5),  -- The Exodus → Egypt
(16, 6),  -- Giving of the Law → Mount Sinai
(19, 4),  -- Conquest of Canaan → Canaan
(20, 22), -- Fall of Jericho → Jericho
(27, 7),  -- David Captures Jerusalem → Jerusalem
(29, 7),  -- Solomon Builds Temple → Jerusalem
(33, 7),  -- Hezekiah's Deliverance → Jerusalem
(35, 7),  -- Fall of Jerusalem → Jerusalem
(36, 9),  -- Babylonian Exile → Babylon
(38, 7),  -- Second Temple Built → Jerusalem
(40, 7),  -- Nehemiah Rebuilds Walls → Jerusalem
(42, 8),  -- Birth of Jesus → Bethlehem
(43, 25), -- Baptism of Jesus → Jordan River
(45, 7),  -- Crucifixion → Jerusalem
(48, 7),  -- Pentecost → Jerusalem
(50, 12), -- Conversion of Paul → Damascus
(55, 7),  -- Destruction of Jerusalem → Jerusalem
(56, 15), -- John Writes Revelation → Patmos
-- Miracle locations (location IDs: 16=Cana, 17=Sea of Galilee, 18=Bethsaida, 19=Nain, 20=Bethany, 21=Gadara, 22=Jericho, 23=Tyre&Sidon, 24=Decapolis, 25=Jordan River)
(58, 16), -- Water Turned to Wine → Cana
(59, 11), -- Official's Son → Capernaum
(60, 17), -- Great Catch of Fish → Sea of Galilee
(61, 11), -- Demon in Capernaum → Capernaum
(62, 11), -- Peter's Mother-in-Law → Capernaum
(64, 11), -- Paralytic → Capernaum
(65, 7),  -- Pool of Bethesda → Jerusalem
(67, 11), -- Centurion's Servant → Capernaum
(68, 19), -- Widow's Son at Nain → Nain
(69, 17), -- Calming the Storm → Sea of Galilee
(70, 21), -- Gerasene Demoniac → Gadara
(75, 18), -- Feeding 5,000 → Bethsaida
(76, 17), -- Walking on Water → Sea of Galilee
(77, 23), -- Syrophoenician's Daughter → Tyre & Sidon
(78, 24), -- Deaf and Mute Man → Decapolis
(80, 18), -- Blind Man at Bethsaida → Bethsaida
(83, 17), -- Coin in the Fish's Mouth → Sea of Galilee
(84, 7),  -- Man Born Blind → Jerusalem
(87, 20), -- Raising of Lazarus → Bethany
(89, 22), -- Blind Bartimaeus → Jericho
(90, 22), -- Two Blind Men at Jericho → Jericho
(91, 7),  -- Cursing Fig Tree → Jerusalem
(92, 7),  -- Malchus' Ear → Jerusalem
(93, 17), -- Catch of 153 Fish → Sea of Galilee
(94, 25), -- Healing of Naaman → Jordan River
-- Church History event locations
-- Location IDs: 58=Constantinople, 59=Carthage, 60=Hippo, 61=Nicaea, 62=Chalcedon,
-- 63=Wittenberg, 64=Geneva, 65=Mainz, 66=Canterbury, 67=Worms, 68=Trent,
-- 69=Aldersgate/London, 70=Edinburgh, 71=Azusa Street, 72=Serampore, 73=Qumran,
-- 74=Northampton, 75=Assisi, 76=Nuremberg, 77=Whitby, 78=Clermont, 79=Wycliffe Country
-- Event IDs: 95=Ignatius, 96=Polycarp, 97=Irenaeus, 98=Origen, 99=Diocletian,
-- 100=Edict Milan, 101=Nicaea, 102=Athanasius, 103=Carthage, 104=Jerome,
-- 105=Chalcedon, 106=Fall Rome, 107=Benedict, 108=Whitby, 109=Islam,
-- 110=Charlemagne, 111=Great Schism, 112=Clermont, 113=Francis, 114=Aquinas,
-- 115=Wycliffe, 116=Hus, 117=Gutenberg, 118=Luther, 119=Diet Worms, 120=Tyndale,
-- 121=Calvin, 122=Trent, 123=KJV, 124=Westminster, 125=Westphalia,
-- 126=Wesley, 127=Edwards, 128=Carey, 129=BFBS, 130=ABS, 131=Spurgeon,
-- 132=Moody, 133=Azusa, 134=Edinburgh, 135=Barmen, 136=Dead Sea, 137=Israel,
-- 138=Vatican II, 139=Graham, 140=Lausanne, 141=Soviet, 142=Global South
(95, 14),  -- Martyrdom of Ignatius → Rome
(101, 61), -- Council of Nicaea → Nicaea
(103, 59), -- Council of Carthage → Carthage
(104, 8),  -- Jerome Vulgate → Bethlehem
(105, 62), -- Council of Chalcedon → Chalcedon
(108, 77), -- Synod of Whitby → Whitby
(111, 58), -- Great Schism → Constantinople
(112, 78), -- Council of Clermont → Clermont
(113, 75), -- Francis founds Franciscans → Assisi
(115, 79), -- Wycliffe Bible → Wycliffe Country
(117, 65), -- Gutenberg Bible → Mainz
(118, 63), -- Luther 95 Theses → Wittenberg
(119, 67), -- Diet of Worms → Worms
(120, 67), -- Tyndale NT → Worms
(121, 64), -- Calvin Institutes → Geneva
(122, 68), -- Council of Trent → Trent
(126, 69), -- Wesley Aldersgate → Aldersgate London
(127, 74), -- Great Awakening → Northampton
(128, 72), -- Carey sails → Serampore
(133, 71), -- Azusa Street Revival → Azusa Street LA
(134, 70), -- Edinburgh Conference → Edinburgh
(136, 73), -- Dead Sea Scrolls → Qumran
(137, 7);  -- State of Israel → Jerusalem
-- Post-Resurrection appearance locations
INSERT INTO event_locations (event_id, location_id) VALUES
(143, 7),  -- Appearance to Mary Magdalene → Jerusalem
(47, 20),  -- Ascension → Bethany (near Mount of Olives)
(144, 57), -- Road to Emmaus → Emmaus
(145, 7),  -- Appearance to Disciples → Jerusalem
(146, 7),  -- Appearance to Thomas → Jerusalem
(147, 17); -- Restoration of Peter → Sea of Galilee
-- NT Books Written — locations
INSERT INTO event_locations (event_id, location_id) VALUES
(149, 7),   -- James Written → Jerusalem
(150, 13),  -- Galatians Written → Antioch
(151, 40),  -- 1 Thessalonians Written → Corinth
(152, 40),  -- 2 Thessalonians Written → Corinth
(153, 41),  -- 1 Corinthians Written → Ephesus
(154, 13),  -- Matthew Written → Antioch
(155, 14),  -- Mark Written → Rome
(156, 36),  -- 2 Corinthians Written → Philippi (Macedonia)
(157, 40),  -- Romans Written → Corinth
(158, 29),  -- Luke Written → Caesarea
(159, 14),  -- Ephesians Written → Rome
(160, 14),  -- Colossians Written → Rome
(161, 14),  -- Philemon Written → Rome
(162, 14),  -- Philippians Written → Rome
(163, 14),  -- Acts Written → Rome
(164, 36),  -- 1 Timothy Written → Philippi (Macedonia)
(165, 36),  -- Titus Written → Philippi (Macedonia)
(166, 14),  -- 1 Peter Written → Rome
(167, 7),   -- Jude Written → Jerusalem
(168, 14),  -- Hebrews Written → Rome
(169, 14),  -- 2 Timothy Written → Rome
(170, 14),  -- 2 Peter Written → Rome
(171, 41),  -- John Written → Ephesus
(172, 41),  -- 1 John Written → Ephesus
(173, 41),  -- 2 John Written → Ephesus
(174, 41);  -- 3 John Written → Ephesus

-- ============================================================
-- SCRIPTURE REFERENCES
-- Order matters: SQLite auto-assigns IDs sequentially.
-- Events = IDs 1-52, People = IDs 53-99, Miracles = IDs 100-135
-- ============================================================
INSERT INTO scripture_references (book_id, chapter_start, verse_start, chapter_end, verse_end, reference_text) VALUES
-- ── Event refs (IDs 1–52) ──
(1, 1, 1, 2, 25, 'Genesis 1:1–2:25'),          -- 1  Creation
(1, 3, 1, 3, 24, 'Genesis 3:1-24'),             -- 2  The Fall
(1, 6, 1, 9, 17, 'Genesis 6:1–9:17'),           -- 3  The Flood
(1, 11, 1, 11, 9, 'Genesis 11:1-9'),            -- 4  Tower of Babel
(1, 12, 1, 12, 9, 'Genesis 12:1-9'),            -- 5  Call of Abraham
(1, 15, 1, 15, 21, 'Genesis 15:1-21'),          -- 6  Abrahamic Covenant
(1, 22, 1, 22, 19, 'Genesis 22:1-19'),          -- 7  Binding of Isaac
(1, 32, 22, 32, 32, 'Genesis 32:22-32'),        -- 8  Jacob Wrestles God
(1, 37, 12, 37, 36, 'Genesis 37:12-36'),        -- 9  Joseph Sold into Slavery
(1, 46, 1, 46, 34, 'Genesis 46:1-34'),          -- 10 Israel Enters Egypt
(2, 12, 1, 14, 31, 'Exodus 12:1–14:31'),        -- 11 The Exodus
(2, 14, 1, 14, 31, 'Exodus 14:1-31'),           -- 12 Crossing the Red Sea
(2, 20, 1, 20, 17, 'Exodus 20:1-17'),           -- 13 Giving of the Law
(4, 14, 1, 14, 45, 'Numbers 14:1-45'),          -- 14 Wilderness Wandering
(6, 1, 1, 12, 24, 'Joshua 1:1–12:24'),          -- 15 Conquest of Canaan
(6, 6, 1, 6, 27, 'Joshua 6:1-27'),              -- 16 Fall of Jericho
(7, 2, 6, 2, 23, 'Judges 2:6-23'),              -- 17 Period of the Judges
(7, 4, 1, 5, 31, 'Judges 4:1–5:31'),            -- 18 Deborah Defeats Sisera
(7, 7, 1, 7, 25, 'Judges 7:1-25'),              -- 19 Gideon Defeats Midian
(9, 10, 1, 10, 27, '1 Samuel 10:1-27'),         -- 20 Saul Anointed King
(10, 5, 1, 5, 5, '2 Samuel 5:1-5'),             -- 21 David Anointed King
(10, 5, 6, 5, 10, '2 Samuel 5:6-10'),           -- 22 David Captures Jerusalem
(10, 7, 1, 7, 29, '2 Samuel 7:1-29'),           -- 23 Davidic Covenant
(11, 6, 1, 6, 38, '1 Kings 6:1-38'),            -- 24 Solomon Builds Temple
(11, 12, 1, 12, 24, '1 Kings 12:1-24'),         -- 25 Kingdom Divides
(11, 18, 20, 18, 40, '1 Kings 18:20-40'),       -- 26 Elijah on Mount Carmel
(12, 17, 1, 17, 41, '2 Kings 17:1-41'),         -- 27 Fall of Samaria
(12, 19, 1, 19, 37, '2 Kings 19:1-37'),         -- 28 Hezekiah's Deliverance
(12, 22, 8, 23, 25, '2 Kings 22:8–23:25'),      -- 29 Josiah's Reforms
(12, 25, 1, 25, 21, '2 Kings 25:1-21'),         -- 30 Fall of Jerusalem
(25, 1, 1, 5, 22, 'Lamentations 1:1–5:22'),     -- 31 Babylonian Exile
(15, 1, 1, 1, 11, 'Ezra 1:1-11'),               -- 32 Edict of Cyrus
(15, 6, 14, 6, 22, 'Ezra 6:14-22'),             -- 33 Second Temple Built
(15, 7, 1, 10, 44, 'Ezra 7:1–10:44'),           -- 34 Ezra's Return
(16, 2, 11, 6, 19, 'Nehemiah 2:11–6:19'),       -- 35 Nehemiah Rebuilds Walls
(17, 4, 1, 9, 32, 'Esther 4:1–9:32'),           -- 36 Esther Saves Her People
(42, 2, 1, 2, 20, 'Luke 2:1-20'),               -- 37 Birth of Jesus
(40, 3, 13, 3, 17, 'Matthew 3:13-17'),          -- 38 Baptism of Jesus
(40, 5, 1, 7, 29, 'Matthew 5:1–7:29'),          -- 39 Sermon on the Mount
(40, 27, 32, 27, 56, 'Matthew 27:32-56'),       -- 40 Crucifixion
(40, 28, 1, 28, 10, 'Matthew 28:1-10'),         -- 41 Resurrection
(44, 1, 9, 1, 11, 'Acts 1:9-11'),               -- 42 Ascension
(44, 2, 1, 2, 47, 'Acts 2:1-47'),               -- 43 Pentecost
(44, 7, 54, 7, 60, 'Acts 7:54-60'),             -- 44 Stoning of Stephen
(44, 9, 1, 9, 31, 'Acts 9:1-31'),               -- 45 Conversion of Paul
(44, 13, 1, 14, 28, 'Acts 13:1–14:28'),         -- 46 Paul's First Missionary Journey
(44, 15, 1, 15, 35, 'Acts 15:1-35'),            -- 47 Council of Jerusalem
(44, 15, 36, 18, 22, 'Acts 15:36–18:22'),       -- 48 Paul's Second Missionary Journey
(44, 18, 23, 21, 16, 'Acts 18:23–21:16'),       -- 49 Paul's Third Missionary Journey
(42, 21, 5, 21, 36, 'Luke 21:5-36'),            -- 50 Destruction of Jerusalem (prophecy)
(66, 1, 1, 22, 21, 'Revelation 1:1–22:21'),     -- 51 John Writes Revelation
(43, 21, 20, 21, 25, 'John 21:20-25'),          -- 52 Death of John

-- ── People refs (IDs 53–99) ──
(1, 1, 26, 5, 5, 'Genesis 1:26–5:5'),           -- 53 Adam
(1, 3, 20, 3, 20, 'Genesis 3:20'),              -- 54 Eve
(1, 6, 8, 9, 29, 'Genesis 6:8–9:29'),           -- 55 Noah
(1, 12, 1, 25, 11, 'Genesis 12:1–25:11'),       -- 56 Abraham
(1, 17, 15, 23, 19, 'Genesis 17:15–23:19'),     -- 57 Sarah
(1, 21, 1, 35, 29, 'Genesis 21:1–35:29'),       -- 58 Isaac
(1, 24, 1, 27, 46, 'Genesis 24:1–27:46'),       -- 59 Rebekah
(1, 25, 19, 49, 33, 'Genesis 25:19–49:33'),     -- 60 Jacob
(1, 37, 1, 50, 26, 'Genesis 37:1–50:26'),       -- 61 Joseph
(5, 34, 1, 34, 12, 'Deuteronomy 34:1-12'),      -- 62 Moses
(2, 4, 14, 4, 16, 'Exodus 4:14-16'),            -- 63 Aaron
(2, 15, 20, 15, 21, 'Exodus 15:20-21'),         -- 64 Miriam
(6, 1, 1, 24, 33, 'Joshua 1:1–24:33'),          -- 65 Joshua
(7, 4, 4, 5, 31, 'Judges 4:4–5:31'),            -- 66 Deborah
(7, 6, 11, 8, 35, 'Judges 6:11–8:35'),          -- 67 Gideon
(7, 13, 1, 16, 31, 'Judges 13:1–16:31'),        -- 68 Samson
(8, 1, 1, 4, 22, 'Ruth 1:1–4:22'),              -- 69 Ruth
(9, 1, 1, 25, 1, '1 Samuel 1:1–25:1'),          -- 70 Samuel
(9, 9, 1, 31, 13, '1 Samuel 9:1–31:13'),        -- 71 Saul
(9, 16, 1, 11, 27, '1 Samuel 16:1–1 Kings 2:11'),-- 72 David
(11, 1, 1, 11, 43, '1 Kings 1:1–11:43'),        -- 73 Solomon
(10, 12, 1, 12, 15, '2 Samuel 12:1-15'),        -- 74 Nathan
(11, 17, 1, 12, 2, '1 Kings 17:1–2 Kings 2:11'),-- 75 Elijah
(12, 2, 1, 13, 21, '2 Kings 2:1–13:21'),        -- 76 Elisha
(23, 1, 1, 66, 24, 'Isaiah 1:1–66:24'),         -- 77 Isaiah
(24, 1, 1, 52, 34, 'Jeremiah 1:1–52:34'),       -- 78 Jeremiah
(26, 1, 1, 48, 35, 'Ezekiel 1:1–48:35'),        -- 79 Ezekiel
(27, 1, 1, 12, 13, 'Daniel 1:1–12:13'),         -- 80 Daniel
(12, 18, 1, 20, 21, '2 Kings 18:1–20:21'),      -- 81 Hezekiah
(12, 22, 1, 23, 30, '2 Kings 22:1–23:30'),      -- 82 Josiah
(11, 12, 25, 14, 20, '1 Kings 12:25–14:20'),    -- 83 Jeroboam
(11, 16, 29, 22, 40, '1 Kings 16:29–22:40'),    -- 84 Ahab
(15, 7, 1, 10, 44, 'Ezra 7:1–10:44'),           -- 85 Ezra
(16, 1, 1, 13, 31, 'Nehemiah 1:1–13:31'),       -- 86 Nehemiah
(15, 2, 1, 5, 2, 'Ezra 2:1–5:2'),               -- 87 Zerubbabel
(17, 1, 1, 10, 3, 'Esther 1:1–10:3'),           -- 88 Esther
(42, 1, 26, 24, 53, 'Luke 1:26–24:53'),         -- 89 Jesus
(42, 1, 26, 2, 52, 'Luke 1:26–2:52'),           -- 90 Mary
(42, 1, 5, 3, 20, 'Luke 1:5–3:20'),             -- 91 John the Baptist
(40, 4, 18, 16, 19, 'Matthew 4:18–16:19'),      -- 92 Peter
(44, 9, 1, 28, 31, 'Acts 9:1–28:31'),           -- 93 Paul
(43, 13, 23, 21, 25, 'John 13:23–21:25'),       -- 94 John the Apostle
(44, 12, 1, 12, 2, 'Acts 12:1-2'),              -- 95 James son of Zebedee
(44, 6, 5, 7, 60, 'Acts 6:5–7:60'),             -- 96 Stephen
(44, 4, 36, 15, 39, 'Acts 4:36–15:39'),         -- 97 Barnabas
(44, 16, 1, 16, 5, 'Acts 16:1-5'),              -- 98 Timothy
(42, 1, 1, 1, 4, 'Luke 1:1-4'),                 -- 99 Luke

-- ── Miracle refs (IDs 100–135) ──
(43, 2, 1, 2, 11, 'John 2:1-11'),               -- 100 Water Turned to Wine
(43, 4, 46, 4, 54, 'John 4:46-54'),             -- 101 Official's Son
(42, 5, 1, 5, 11, 'Luke 5:1-11'),               -- 102 Great Catch of Fish
(41, 1, 21, 1, 28, 'Mark 1:21-28'),             -- 103 Demon in Capernaum
(40, 8, 14, 8, 15, 'Matthew 8:14-15'),          -- 104 Peter's Mother-in-Law
(40, 8, 1, 8, 4, 'Matthew 8:1-4'),              -- 105 Cleansing a Leper
(41, 2, 1, 2, 12, 'Mark 2:1-12'),               -- 106 Healing the Paralytic
(43, 5, 1, 5, 17, 'John 5:1-17'),               -- 107 Pool of Bethesda
(40, 12, 9, 12, 14, 'Matthew 12:9-14'),         -- 108 Withered Hand
(40, 8, 5, 8, 13, 'Matthew 8:5-13'),            -- 109 Centurion's Servant
(42, 7, 11, 7, 17, 'Luke 7:11-17'),             -- 110 Widow's Son at Nain
(41, 4, 35, 4, 41, 'Mark 4:35-41'),             -- 111 Calming the Storm
(41, 5, 1, 5, 20, 'Mark 5:1-20'),               -- 112 Gerasene Demoniac
(41, 5, 25, 5, 34, 'Mark 5:25-34'),             -- 113 Woman with Issue of Blood
(41, 5, 21, 5, 43, 'Mark 5:21-43'),             -- 114 Jairus' Daughter
(40, 9, 27, 9, 31, 'Matthew 9:27-31'),          -- 115 Two Blind Men
(40, 9, 32, 9, 34, 'Matthew 9:32-34'),          -- 116 Mute Man
(43, 6, 1, 6, 15, 'John 6:1-15'),               -- 117 Feeding 5000
(40, 14, 22, 14, 33, 'Matthew 14:22-33'),       -- 118 Walking on Water
(40, 15, 21, 15, 28, 'Matthew 15:21-28'),       -- 119 Syrophoenician Daughter
(41, 7, 31, 7, 37, 'Mark 7:31-37'),             -- 120 Deaf and Mute Man
(40, 15, 32, 15, 39, 'Matthew 15:32-39'),       -- 121 Feeding 4000
(41, 8, 22, 8, 26, 'Mark 8:22-26'),             -- 122 Blind Man at Bethsaida
(40, 17, 1, 17, 13, 'Matthew 17:1-13'),         -- 123 Transfiguration
(41, 9, 14, 9, 29, 'Mark 9:14-29'),             -- 124 Boy with a Demon
(43, 9, 1, 9, 41, 'John 9:1-41'),               -- 125 Man Born Blind
(42, 13, 10, 13, 17, 'Luke 13:10-17'),          -- 126 Crippled Woman
(42, 14, 1, 14, 6, 'Luke 14:1-6'),              -- 127 Man with Dropsy
(43, 11, 1, 11, 44, 'John 11:1-44'),            -- 128 Raising of Lazarus
(42, 17, 11, 17, 19, 'Luke 17:11-19'),          -- 129 Ten Lepers
(41, 10, 46, 10, 52, 'Mark 10:46-52'),          -- 130 Blind Bartimaeus
(40, 21, 18, 21, 22, 'Matthew 21:18-22'),       -- 131 Cursing the Fig Tree
(42, 22, 49, 22, 51, 'Luke 22:49-51'),          -- 132 Malchus' Ear
(43, 21, 1, 21, 14, 'John 21:1-14'),            -- 133 Catch of 153 Fish
(40, 17, 24, 17, 27, 'Matthew 17:24-27'),       -- 134 Coin in Fish's Mouth
(40, 20, 29, 20, 34, 'Matthew 20:29-34'),       -- 135 Two Blind Men at Jericho
(12, 5, 1, 5, 27, '2 Kings 5:1-27'),             -- 136 Naaman (person)
(12, 5, 1, 5, 27, '2 Kings 5:1-27'),             -- 137 Healing of Naaman (event)

-- ── New People refs (IDs 138–237) ──
(1, 4, 25, 5, 8, 'Genesis 4:25–5:8'),            -- 138 Seth
(1, 5, 18, 5, 24, 'Genesis 5:18-24'),            -- 139 Enoch
(1, 5, 25, 5, 27, 'Genesis 5:25-27'),            -- 140 Methuselah
(1, 5, 28, 5, 31, 'Genesis 5:28-31'),            -- 141 Lamech
(1, 10, 21, 11, 26, 'Genesis 10:21–11:26'),      -- 142 Shem
(1, 10, 6, 10, 20, 'Genesis 10:6-20'),           -- 143 Ham
(1, 10, 2, 10, 5, 'Genesis 10:2-5'),             -- 144 Japheth
(1, 13, 1, 19, 38, 'Genesis 13:1–19:38'),        -- 145 Lot
(1, 16, 1, 25, 18, 'Genesis 16:1–25:18'),        -- 146 Ishmael
(1, 16, 1, 21, 21, 'Genesis 16:1–21:21'),        -- 147 Hagar
(1, 25, 19, 36, 43, 'Genesis 25:19–36:43'),      -- 148 Esau
(1, 24, 29, 31, 55, 'Genesis 24:29–31:55'),      -- 149 Laban
(1, 29, 16, 30, 21, 'Genesis 29:16–30:21'),      -- 150 Leah
(1, 29, 6, 35, 20, 'Genesis 29:6–35:20'),        -- 151 Rachel
(1, 38, 1, 49, 12, 'Genesis 38:1–49:12'),        -- 152 Judah
(1, 35, 16, 45, 14, 'Genesis 35:16–45:14'),      -- 153 Benjamin
(1, 37, 21, 49, 4, 'Genesis 37:21–49:4'),        -- 154 Reuben
(2, 5, 1, 14, 31, 'Exodus 5:1–14:31'),           -- 155 Pharaoh of Exodus
(4, 13, 6, 14, 38, 'Numbers 13:6–14:38'),        -- 156 Caleb
(4, 25, 6, 25, 13, 'Numbers 25:6-13'),           -- 157 Phinehas
(2, 18, 1, 18, 27, 'Exodus 18:1-27'),            -- 158 Jethro
(2, 2, 21, 4, 26, 'Exodus 2:21–4:26'),           -- 159 Zipporah
(7, 3, 7, 3, 11, 'Judges 3:7-11'),               -- 160 Othniel
(7, 3, 12, 3, 30, 'Judges 3:12-30'),             -- 161 Ehud
(7, 11, 1, 12, 7, 'Judges 11:1–12:7'),           -- 162 Jephthah
(9, 1, 1, 4, 22, '1 Samuel 1:1–4:22'),           -- 163 Eli
(9, 1, 1, 2, 21, '1 Samuel 1:1–2:21'),           -- 164 Hannah
(8, 2, 1, 4, 22, 'Ruth 2:1–4:22'),               -- 165 Boaz
(8, 1, 1, 4, 17, 'Ruth 1:1–4:17'),               -- 166 Naomi
(7, 9, 1, 9, 57, 'Judges 9:1-57'),               -- 167 Abimelech
(9, 25, 2, 25, 42, '1 Samuel 25:2-42'),          -- 168 Abigail
(10, 11, 1, 12, 25, '2 Samuel 11:1–12:25'),      -- 169 Bathsheba
(10, 2, 13, 20, 23, '2 Samuel 2:13–20:23'),      -- 170 Joab
(10, 13, 1, 18, 33, '2 Samuel 13:1–18:33'),      -- 171 Absalom
(9, 14, 1, 31, 2, '1 Samuel 14:1–31:2'),         -- 172 Jonathan
(9, 18, 20, 19, 17, '1 Samuel 18:20–19:17'),     -- 173 Michal
(11, 12, 1, 14, 31, '1 Kings 12:1–14:31'),       -- 174 Rehoboam
(11, 15, 9, 15, 24, '1 Kings 15:9-24'),          -- 175 Asa
(11, 22, 41, 22, 50, '1 Kings 22:41-50'),        -- 176 Jehoshaphat
(12, 8, 16, 8, 24, '2 Kings 8:16-24'),           -- 177 Jehoram of Judah
(12, 15, 1, 15, 7, '2 Kings 15:1-7'),            -- 178 Uzziah
(12, 16, 1, 16, 20, '2 Kings 16:1-20'),          -- 179 Ahaz
(12, 21, 1, 21, 18, '2 Kings 21:1-18'),          -- 180 Manasseh
(12, 23, 34, 24, 6, '2 Kings 23:34–24:6'),       -- 181 Jehoiakim
(12, 24, 17, 25, 7, '2 Kings 24:17–25:7'),       -- 182 Zedekiah
(12, 11, 1, 11, 20, '2 Kings 11:1-20'),          -- 183 Athaliah
(12, 11, 21, 12, 21, '2 Kings 11:21–12:21'),     -- 184 Joash of Judah
(12, 14, 1, 14, 20, '2 Kings 14:1-20'),          -- 185 Amaziah
(12, 15, 32, 15, 38, '2 Kings 15:32-38'),        -- 186 Jotham
(11, 15, 25, 15, 32, '1 Kings 15:25-32'),        -- 187 Nadab
(11, 15, 33, 16, 7, '1 Kings 15:33–16:7'),       -- 188 Baasha
(11, 16, 21, 16, 28, '1 Kings 16:21-28'),        -- 189 Omri
(11, 22, 51, 22, 53, '1 Kings 22:51-53'),        -- 190 Ahaziah of Israel
(12, 3, 1, 3, 27, '2 Kings 3:1-27'),             -- 191 Jehoram of Israel
(12, 9, 1, 10, 36, '2 Kings 9:1–10:36'),         -- 192 Jehu
(12, 14, 23, 14, 29, '2 Kings 14:23-29'),        -- 193 Jeroboam II
(12, 17, 1, 17, 6, '2 Kings 17:1-6'),            -- 194 Hoshea
(11, 16, 9, 16, 20, '1 Kings 16:9-20'),          -- 195 Zimri
(11, 16, 31, 21, 25, '1 Kings 16:31–21:25'),     -- 196 Jezebel
(28, 1, 1, 14, 9, 'Hosea 1:1–14:9'),             -- 197 Hosea (prophet)
(29, 1, 1, 3, 21, 'Joel 1:1–3:21'),              -- 198 Joel
(30, 1, 1, 9, 15, 'Amos 1:1–9:15'),              -- 199 Amos
(31, 1, 1, 1, 21, 'Obadiah 1:1-21'),             -- 200 Obadiah
(32, 1, 1, 4, 11, 'Jonah 1:1–4:11'),             -- 201 Jonah
(33, 1, 1, 7, 20, 'Micah 1:1–7:20'),             -- 202 Micah
(34, 1, 1, 3, 19, 'Nahum 1:1–3:19'),             -- 203 Nahum
(35, 1, 1, 3, 19, 'Habakkuk 1:1–3:19'),          -- 204 Habakkuk
(36, 1, 1, 3, 20, 'Zephaniah 1:1–3:20'),         -- 205 Zephaniah
(37, 1, 1, 2, 23, 'Haggai 1:1–2:23'),            -- 206 Haggai
(38, 1, 1, 14, 21, 'Zechariah 1:1–14:21'),       -- 207 Zechariah (prophet)
(39, 1, 1, 4, 6, 'Malachi 1:1–4:6'),             -- 208 Malachi
(17, 2, 5, 10, 3, 'Esther 2:5–10:3'),            -- 209 Mordecai
(18, 1, 1, 42, 17, 'Job 1:1–42:17'),             -- 210 Job
(40, 1, 18, 2, 23, 'Matthew 1:18–2:23'),         -- 211 Joseph of Nazareth
(43, 11, 1, 12, 11, 'John 11:1–12:11'),          -- 212 Lazarus
(42, 10, 38, 10, 42, 'Luke 10:38-42'),           -- 213 Martha
(43, 20, 1, 20, 18, 'John 20:1-18'),             -- 214 Mary Magdalene
(43, 3, 1, 19, 42, 'John 3:1–19:42'),            -- 215 Nicodemus
(40, 9, 9, 10, 3, 'Matthew 9:9–10:3'),           -- 216 Matthew/Levi
(43, 1, 35, 1, 42, 'John 1:35-42'),              -- 217 Andrew
(43, 1, 43, 14, 9, 'John 1:43–14:9'),            -- 218 Philip
(43, 1, 45, 1, 51, 'John 1:45-51'),              -- 219 Bartholomew/Nathanael
(43, 11, 16, 20, 29, 'John 11:16–20:29'),        -- 220 Thomas
(40, 10, 3, 10, 3, 'Matthew 10:3'),              -- 221 James son of Alphaeus
(43, 14, 22, 14, 22, 'John 14:22'),              -- 222 Thaddaeus
(42, 6, 15, 6, 15, 'Luke 6:15'),                 -- 223 Simon the Zealot
(40, 26, 14, 27, 10, 'Matthew 26:14–27:10'),     -- 224 Judas Iscariot
(44, 1, 21, 1, 26, 'Acts 1:21-26'),              -- 225 Matthias
(44, 12, 12, 15, 39, 'Acts 12:12–15:39'),        -- 226 Mark
(44, 15, 22, 17, 15, 'Acts 15:22–17:15'),        -- 227 Silas
(56, 1, 4, 1, 5, 'Titus 1:4-5'),                 -- 228 Titus
(44, 18, 2, 18, 26, 'Acts 18:2-26'),             -- 229 Priscilla
(44, 18, 2, 18, 26, 'Acts 18:2-26'),             -- 230 Aquila
(44, 18, 24, 18, 28, 'Acts 18:24-28'),           -- 231 Apollos
(57, 1, 1, 1, 25, 'Philemon 1:1-25'),            -- 232 Philemon
(44, 15, 13, 15, 21, 'Acts 15:13-21'),           -- 233 James brother of Jesus
(40, 2, 1, 2, 19, 'Matthew 2:1-19'),             -- 234 Herod the Great
(40, 27, 11, 27, 26, 'Matthew 27:11-26'),        -- 235 Pontius Pilate
(42, 2, 36, 2, 38, 'Luke 2:36-38'),              -- 236 Anna

-- ── Parallel Gospel / multi-source event refs (IDs 237+) ──
-- Life of Christ parallel accounts
(40, 1, 18, 2, 23, 'Matthew 1:18–2:23'),         -- 237 Birth of Jesus (Matthew)
(41, 1, 9, 1, 11, 'Mark 1:9-11'),                -- 238 Baptism of Jesus (Mark)
(42, 3, 21, 3, 22, 'Luke 3:21-22'),              -- 239 Baptism of Jesus (Luke)
(43, 1, 29, 1, 34, 'John 1:29-34'),              -- 240 Baptism of Jesus (John)
(42, 6, 17, 6, 49, 'Luke 6:17-49'),              -- 241 Sermon on the Plain (Luke)
(41, 15, 21, 15, 41, 'Mark 15:21-41'),           -- 242 Crucifixion (Mark)
(42, 23, 26, 23, 49, 'Luke 23:26-49'),           -- 243 Crucifixion (Luke)
(43, 19, 17, 19, 37, 'John 19:17-37'),           -- 244 Crucifixion (John)
(41, 16, 1, 16, 8, 'Mark 16:1-8'),               -- 245 Resurrection (Mark)
(42, 24, 1, 24, 12, 'Luke 24:1-12'),             -- 246 Resurrection (Luke)
(43, 20, 1, 20, 18, 'John 20:1-18'),             -- 247 Resurrection (John)
(42, 24, 50, 24, 53, 'Luke 24:50-53'),           -- 248 Ascension (Luke)
(41, 16, 19, 16, 20, 'Mark 16:19-20'),           -- 249 Ascension (Mark)
-- Miracle parallel accounts
(42, 4, 31, 4, 37, 'Luke 4:31-37'),              -- 250 Demon in Capernaum (Luke)
(41, 1, 29, 1, 31, 'Mark 1:29-31'),              -- 251 Peter's Mother-in-Law (Mark)
(42, 4, 38, 4, 39, 'Luke 4:38-39'),              -- 252 Peter's Mother-in-Law (Luke)
(41, 1, 40, 1, 45, 'Mark 1:40-45'),              -- 253 Cleansing a Leper (Mark)
(42, 5, 12, 5, 16, 'Luke 5:12-16'),              -- 254 Cleansing a Leper (Luke)
(40, 9, 1, 9, 8, 'Matthew 9:1-8'),               -- 255 Healing the Paralytic (Matthew)
(42, 5, 17, 5, 26, 'Luke 5:17-26'),              -- 256 Healing the Paralytic (Luke)
(41, 3, 1, 3, 6, 'Mark 3:1-6'),                  -- 257 Withered Hand (Mark)
(42, 6, 6, 6, 11, 'Luke 6:6-11'),                -- 258 Withered Hand (Luke)
(42, 7, 1, 7, 10, 'Luke 7:1-10'),                -- 259 Centurion's Servant (Luke)
(40, 8, 23, 8, 27, 'Matthew 8:23-27'),           -- 260 Calming the Storm (Matthew)
(42, 8, 22, 8, 25, 'Luke 8:22-25'),              -- 261 Calming the Storm (Luke)
(40, 8, 28, 8, 34, 'Matthew 8:28-34'),           -- 262 Gerasene Demoniac (Matthew)
(42, 8, 26, 8, 39, 'Luke 8:26-39'),              -- 263 Gerasene Demoniac (Luke)
(40, 9, 20, 9, 22, 'Matthew 9:20-22'),           -- 264 Woman with Issue of Blood (Matthew)
(42, 8, 43, 8, 48, 'Luke 8:43-48'),              -- 265 Woman with Issue of Blood (Luke)
(40, 9, 18, 9, 26, 'Matthew 9:18-26'),           -- 266 Jairus' Daughter (Matthew)
(42, 8, 40, 8, 56, 'Luke 8:40-56'),              -- 267 Jairus' Daughter (Luke)
(40, 14, 13, 14, 21, 'Matthew 14:13-21'),        -- 268 Feeding 5000 (Matthew)
(41, 6, 30, 6, 44, 'Mark 6:30-44'),              -- 269 Feeding 5000 (Mark)
(42, 9, 10, 9, 17, 'Luke 9:10-17'),              -- 270 Feeding 5000 (Luke)
(41, 6, 45, 6, 52, 'Mark 6:45-52'),              -- 271 Walking on Water (Mark)
(43, 6, 16, 6, 21, 'John 6:16-21'),              -- 272 Walking on Water (John)
(41, 7, 24, 7, 30, 'Mark 7:24-30'),              -- 273 Syrophoenician Daughter (Mark)
(41, 8, 1, 8, 10, 'Mark 8:1-10'),                -- 274 Feeding 4000 (Mark)
(41, 9, 2, 9, 13, 'Mark 9:2-13'),                -- 275 Transfiguration (Mark)
(42, 9, 28, 9, 36, 'Luke 9:28-36'),              -- 276 Transfiguration (Luke)
(40, 17, 14, 17, 21, 'Matthew 17:14-21'),        -- 277 Boy with a Demon (Matthew)
(42, 9, 37, 9, 43, 'Luke 9:37-43'),              -- 278 Boy with a Demon (Luke)
(40, 20, 29, 20, 34, 'Matthew 20:29-34'),        -- 279 Blind Bartimaeus (Matthew)
(42, 18, 35, 18, 43, 'Luke 18:35-43'),           -- 280 Blind Bartimaeus (Luke)
(41, 11, 12, 11, 25, 'Mark 11:12-25'),           -- 281 Cursing the Fig Tree (Mark)
(43, 18, 10, 18, 11, 'John 18:10-11'),           -- 282 Malchus' Ear (John)
-- OT events with parallel accounts
(14, 36, 1, 36, 23, '2 Chronicles 36:1-23'),     -- 283 Fall of Jerusalem (2 Chronicles)
(24, 52, 1, 52, 34, 'Jeremiah 52:1-34'),         -- 284 Fall of Jerusalem (Jeremiah)
(14, 32, 1, 32, 23, '2 Chronicles 32:1-23'),     -- 285 Hezekiah's Deliverance (2 Chronicles)
(23, 36, 1, 37, 38, 'Isaiah 36:1–37:38'),        -- 286 Hezekiah's Deliverance (Isaiah)
(14, 34, 1, 35, 27, '2 Chronicles 34:1–35:27'),  -- 287 Josiah's Reforms (2 Chronicles)
(13, 10, 1, 13, 14, '1 Chronicles 10:1-14'),     -- 288 Saul Anointed / Death (1 Chronicles)
(13, 11, 1, 11, 9, '1 Chronicles 11:1-9'),       -- 289 David Anointed King (1 Chronicles)
(13, 17, 1, 17, 27, '1 Chronicles 17:1-27'),     -- 290 Davidic Covenant (1 Chronicles)
(14, 3, 1, 7, 22, '2 Chronicles 3:1–7:22'),      -- 291 Solomon Builds Temple (2 Chronicles)
(14, 10, 1, 10, 19, '2 Chronicles 10:1-19'),     -- 292 Kingdom Divides (2 Chronicles)

-- ── Gen 5/11 ancestor refs (IDs 293-304) ──
(1, 5, 6, 5, 11, 'Genesis 5:6-11'),              -- 293 Enosh
(1, 5, 9, 5, 14, 'Genesis 5:9-14'),              -- 294 Kenan
(1, 5, 12, 5, 17, 'Genesis 5:12-17'),            -- 295 Mahalalel
(1, 5, 15, 5, 20, 'Genesis 5:15-20'),            -- 296 Jared
(1, 11, 10, 11, 13, 'Genesis 11:10-13'),         -- 297 Arphaxad
(1, 11, 12, 11, 15, 'Genesis 11:12-15'),         -- 298 Salah
(1, 11, 14, 11, 17, 'Genesis 11:14-17'),         -- 299 Eber
(1, 11, 16, 11, 19, 'Genesis 11:16-19'),         -- 300 Peleg
(1, 11, 18, 11, 21, 'Genesis 11:18-21'),         -- 301 Reu
(1, 11, 20, 11, 23, 'Genesis 11:20-23'),         -- 302 Serug
(1, 11, 22, 11, 25, 'Genesis 11:22-25'),         -- 303 Nahor
(1, 11, 24, 11, 32, 'Genesis 11:24-32'),         -- 304 Terah

-- ── 100 Additional People refs (IDs 305–380) ──
(1, 4, 1, 4, 16, 'Genesis 4:1-16'),              -- 305 Cain and Abel
(1, 4, 8, 4, 8, 'Genesis 4:8'),                   -- 306 Abel murdered
(1, 34, 1, 34, 31, 'Genesis 34:1-31'),           -- 307 Dinah at Shechem
(1, 38, 1, 38, 30, 'Genesis 38:1-30'),           -- 308 Tamar and Judah
(1, 48, 1, 48, 20, 'Genesis 48:1-20'),           -- 309 Jacob adopts Manasseh & Ephraim
(1, 14, 18, 14, 20, 'Genesis 14:18-20'),         -- 310 Melchizedek blesses Abraham
(58, 7, 1, 7, 28, 'Hebrews 7:1-28'),             -- 311 Melchizedek type of Christ
(1, 39, 1, 39, 20, 'Genesis 39:1-20'),           -- 312 Potiphar and Joseph
(1, 25, 1, 25, 4, 'Genesis 25:1-4'),             -- 313 Keturah
(4, 16, 1, 16, 35, 'Numbers 16:1-35'),           -- 314 Korah's rebellion
(4, 22, 1, 24, 25, 'Numbers 22:1–24:25'),        -- 315 Balaam
(6, 2, 1, 2, 24, 'Joshua 2:1-24'),               -- 316 Rahab and the spies
(58, 11, 31, 11, 31, 'Hebrews 11:31'),           -- 317 Rahab in Hebrews
(6, 7, 1, 7, 26, 'Joshua 7:1-26'),               -- 318 Achan's sin
(2, 17, 10, 17, 12, 'Exodus 17:10-12'),          -- 319 Hur holds up Moses' arms
(2, 31, 1, 31, 11, 'Exodus 31:1-11'),            -- 320 Bezalel the craftsman
(4, 20, 28, 20, 28, 'Numbers 20:28'),            -- 321 Eleazar succeeds Aaron
(7, 4, 1, 4, 24, 'Judges 4:1-24'),               -- 322 Barak and Deborah
(7, 4, 17, 4, 22, 'Judges 4:17-22'),             -- 323 Jael kills Sisera
(7, 13, 1, 13, 25, 'Judges 13:1-25'),            -- 324 Manoah and Samson's birth
(7, 16, 4, 16, 21, 'Judges 16:4-21'),            -- 325 Delilah betrays Samson
(10, 2, 8, 2, 10, '2 Samuel 2:8-10'),            -- 326 Ish-bosheth made king
(10, 3, 27, 3, 27, '2 Samuel 3:27'),             -- 327 Abner killed by Joab
(10, 9, 1, 9, 13, '2 Samuel 9:1-13'),            -- 328 Mephibosheth
(10, 11, 1, 11, 27, '2 Samuel 11:1-27'),         -- 329 Uriah the Hittite
(11, 5, 1, 5, 18, '1 Kings 5:1-18'),             -- 330 Hiram of Tyre
(11, 1, 5, 1, 53, '1 Kings 1:5-53'),             -- 331 Adonijah
(10, 16, 5, 16, 13, '2 Samuel 16:5-13'),         -- 332 Shimei curses David
(10, 15, 32, 15, 37, '2 Samuel 15:32-37'),       -- 333 Hushai the Archite
(10, 17, 1, 17, 23, '2 Samuel 17:1-23'),         -- 334 Ahithophel
(10, 15, 24, 15, 29, '2 Samuel 15:24-29'),       -- 335 Zadok the priest
(11, 17, 8, 17, 24, '1 Kings 17:8-24'),          -- 336 Widow of Zarephath
(12, 5, 20, 5, 27, '2 Kings 5:20-27'),           -- 337 Gehazi
(12, 4, 8, 4, 37, '2 Kings 4:8-37'),             -- 338 Shunammite woman
(12, 8, 7, 8, 15, '2 Kings 8:7-15'),             -- 339 Hazael
(12, 18, 13, 19, 37, '2 Kings 18:13–19:37'),     -- 340 Sennacherib
(27, 1, 1, 1, 21, 'Daniel 1:1-21'),              -- 341 Daniel's friends
(27, 3, 1, 3, 30, 'Daniel 3:1-30'),              -- 342 Fiery furnace
(27, 5, 1, 5, 31, 'Daniel 5:1-31'),              -- 343 Belshazzar's feast
(23, 44, 28, 45, 1, 'Isaiah 44:28–45:1'),        -- 344 Cyrus prophesied
(14, 36, 22, 36, 23, '2 Chronicles 36:22-23'),   -- 345 Cyrus decree
(27, 6, 1, 6, 28, 'Daniel 6:1-28'),              -- 346 Darius and the lions' den
(9, 25, 2, 25, 42, '1 Samuel 25:2-42'),          -- 347 Nabal and Abigail
(12, 22, 14, 22, 20, '2 Kings 22:14-20'),        -- 348 Huldah the prophetess
(12, 22, 8, 22, 14, '2 Kings 22:8-14'),          -- 349 Hilkiah finds the book
(16, 2, 10, 2, 20, 'Nehemiah 2:10-20'),          -- 350 Sanballat opposes
(17, 3, 1, 3, 15, 'Esther 3:1-15'),              -- 351 Haman's plot
(17, 1, 1, 1, 22, 'Esther 1:1-22'),              -- 352 Vashti deposed
(42, 2, 25, 2, 35, 'Luke 2:25-35'),              -- 353 Simeon at the Temple
(42, 1, 5, 1, 25, 'Luke 1:5-25'),                -- 354 Zechariah
(42, 1, 39, 1, 45, 'Luke 1:39-45'),              -- 355 Elizabeth
(40, 14, 1, 14, 12, 'Matthew 14:1-12'),          -- 356 Herod Antipas
(40, 14, 6, 14, 11, 'Matthew 14:6-11'),          -- 357 Salome's dance
(40, 26, 57, 26, 68, 'Matthew 26:57-68'),        -- 358 Caiaphas at trial
(43, 18, 13, 18, 24, 'John 18:13-24'),           -- 359 Annas questions Jesus
(40, 27, 15, 27, 26, 'Matthew 27:15-26'),        -- 360 Barabbas
(40, 27, 57, 27, 60, 'Matthew 27:57-60'),        -- 361 Joseph of Arimathea
(40, 27, 32, 27, 32, 'Matthew 27:32'),           -- 362 Simon of Cyrene
(42, 19, 1, 19, 10, 'Luke 19:1-10'),             -- 363 Zacchaeus
(41, 5, 22, 5, 43, 'Mark 5:22-43'),              -- 364 Jairus' daughter
(42, 24, 13, 24, 35, 'Luke 24:13-35'),           -- 365 Cleopas on Emmaus road
(43, 12, 1, 12, 8, 'John 12:1-8'),               -- 366 Mary of Bethany anoints Jesus
(44, 9, 10, 9, 19, 'Acts 9:10-19'),              -- 367 Ananias baptizes Paul
(44, 10, 1, 10, 48, 'Acts 10:1-48'),             -- 368 Cornelius
(44, 16, 14, 16, 15, 'Acts 16:14-15'),           -- 369 Lydia
(44, 5, 34, 5, 39, 'Acts 5:34-39'),              -- 370 Gamaliel
(44, 11, 27, 11, 28, 'Acts 11:27-28'),           -- 371 Agabus
(44, 9, 36, 9, 43, 'Acts 9:36-43'),              -- 372 Dorcas raised
(44, 8, 4, 8, 40, 'Acts 8:4-40'),                -- 373 Philip the Evangelist
(57, 1, 10, 1, 21, 'Philemon 1:10-21'),          -- 374 Onesimus
(44, 12, 13, 12, 16, 'Acts 12:13-16'),           -- 375 Rhoda
(44, 12, 1, 12, 23, 'Acts 12:1-23'),             -- 376 Herod Agrippa I
(44, 25, 13, 26, 32, 'Acts 25:13–26:32'),        -- 377 Herod Agrippa II
(44, 24, 1, 24, 27, 'Acts 24:1-27'),             -- 378 Felix
(44, 25, 1, 25, 12, 'Acts 25:1-12'),             -- 379 Festus
(44, 5, 1, 5, 11, 'Acts 5:1-11'),                -- 380 Ananias and Sapphira
(45, 16, 1, 16, 2, 'Romans 16:1-2'),             -- 381 Phoebe
-- ── New event refs for added events (IDs 382–386) ──
(1, 19, 1, 19, 29, 'Genesis 19:1-29'),           -- 382 Destruction of Sodom and Gomorrah
(1, 17, 1, 17, 27, 'Genesis 17:1-27'),           -- 383 Covenant of Circumcision
(1, 41, 37, 41, 57, 'Genesis 41:37-57'),         -- 384 Joseph Made Ruler of Egypt
(2, 40, 1, 40, 38, 'Exodus 40:1-38'),            -- 385 Tabernacle Completed
(9, 4, 1, 4, 11, '1 Samuel 4:1-11'),             -- 386 Ark Captured by Philistines
-- ── Post-Resurrection appearance refs (IDs 387–396) ──
(43, 20, 11, 20, 18, 'John 20:11-18'),            -- 387 Appearance to Mary Magdalene
(41, 16, 9, 16, 11, 'Mark 16:9-11'),              -- 388 Appearance to Mary Magdalene (parallel)
(42, 24, 13, 24, 35, 'Luke 24:13-35'),            -- 389 Road to Emmaus
(41, 16, 12, 16, 13, 'Mark 16:12-13'),            -- 390 Road to Emmaus (parallel)
(43, 20, 19, 20, 25, 'John 20:19-25'),            -- 391 Appearance to Disciples
(42, 24, 36, 24, 43, 'Luke 24:36-43'),            -- 392 Appearance to Disciples (parallel)
(43, 20, 26, 20, 29, 'John 20:26-29'),            -- 393 Appearance to Thomas
(43, 21, 15, 21, 19, 'John 21:15-19'),            -- 394 Restoration of Peter
(40, 28, 16, 28, 20, 'Matthew 28:16-20'),         -- 395 Great Commission
(41, 16, 15, 16, 18, 'Mark 16:15-18');            -- 396 Great Commission (parallel)
-- ── NT Books Written refs (IDs 397–422) ──
INSERT INTO scripture_references (book_id, chapter_start, verse_start, chapter_end, verse_end, reference_text) VALUES
(59, 1, 1, 1, 1, 'James 1:1'),                   -- 397 James Written
(48, 1, 1, 1, 5, 'Galatians 1:1-5'),             -- 398 Galatians Written
(52, 1, 1, 1, 1, '1 Thessalonians 1:1'),         -- 399 1 Thessalonians Written
(53, 1, 1, 1, 2, '2 Thessalonians 1:1-2'),       -- 400 2 Thessalonians Written
(46, 1, 1, 1, 3, '1 Corinthians 1:1-3'),         -- 401 1 Corinthians Written
(40, 1, 1, 1, 1, 'Matthew 1:1'),                 -- 402 Matthew Written
(41, 1, 1, 1, 1, 'Mark 1:1'),                    -- 403 Mark Written
(47, 1, 1, 1, 2, '2 Corinthians 1:1-2'),         -- 404 2 Corinthians Written
(45, 1, 1, 1, 7, 'Romans 1:1-7'),                -- 405 Romans Written
(42, 1, 1, 1, 4, 'Luke 1:1-4'),                  -- 406 Luke Written
(49, 1, 1, 1, 2, 'Ephesians 1:1-2'),             -- 407 Ephesians Written
(51, 1, 1, 1, 2, 'Colossians 1:1-2'),            -- 408 Colossians Written
(57, 1, 1, 1, 3, 'Philemon 1-3'),                -- 409 Philemon Written
(50, 1, 1, 1, 2, 'Philippians 1:1-2'),           -- 410 Philippians Written
(44, 1, 1, 1, 2, 'Acts 1:1-2'),                  -- 411 Acts Written
(54, 1, 1, 1, 2, '1 Timothy 1:1-2'),             -- 412 1 Timothy Written
(56, 1, 1, 1, 4, 'Titus 1:1-4'),                 -- 413 Titus Written
(60, 1, 1, 1, 2, '1 Peter 1:1-2'),               -- 414 1 Peter Written
(65, 1, 1, 1, 2, 'Jude 1-2'),                    -- 415 Jude Written
(58, 1, 1, 1, 4, 'Hebrews 1:1-4'),               -- 416 Hebrews Written
(55, 1, 1, 1, 2, '2 Timothy 1:1-2'),             -- 417 2 Timothy Written
(61, 1, 1, 1, 2, '2 Peter 1:1-2'),               -- 418 2 Peter Written
(43, 1, 1, 1, 5, 'John 1:1-5'),                  -- 419 John Written
(62, 1, 1, 1, 4, '1 John 1:1-4'),                -- 420 1 John Written
(63, 1, 1, 1, 3, '2 John 1-3'),                  -- 421 2 John Written
(64, 1, 1, 1, 4, '3 John 1-4');                  -- 422 3 John Written

-- Link events to scripture
-- NOTE: event_id is determined by INSERT order, NOT by scripture_id.
-- The mapping below uses the correct event IDs from the events table.
INSERT INTO event_scripture (event_id, scripture_id) VALUES
-- Primeval & Patriarchs (events 1–13)
(1, 1),    -- Creation → Genesis 1:1–2:25
(2, 2),    -- The Fall → Genesis 3:1-24
(3, 3),    -- The Flood → Genesis 6:1–9:17
(4, 4),    -- Tower of Babel → Genesis 11:1-9
(5, 5),    -- Call of Abraham → Genesis 12:1-9
(6, 6),    -- Abrahamic Covenant → Genesis 15:1-21
(7, 7),    -- Binding of Isaac → Genesis 22:1-19
(8, 382),  -- Destruction of Sodom and Gomorrah → Genesis 19:1-29
(9, 383),  -- Covenant of Circumcision → Genesis 17:1-27
(10, 8),   -- Jacob Wrestles God → Genesis 32:22-32
(11, 9),   -- Joseph Sold into Slavery → Genesis 37:12-36
(12, 384), -- Joseph Made Ruler of Egypt → Genesis 41:37-57
(13, 10),  -- Israel Enters Egypt → Genesis 46:1-34
-- Egypt & Exodus (events 14–18)
(14, 11),  -- The Exodus → Exodus 12:1–14:31
(15, 12),  -- Crossing the Red Sea → Exodus 14:1-31
(16, 13),  -- Giving of the Law → Exodus 20:1-17
(17, 14),  -- Wilderness Wandering → Numbers 14:1-45
(18, 385), -- Tabernacle Completed → Exodus 40:1-38
-- Conquest & Judges (events 19–24)
(19, 15),  -- Conquest of Canaan → Joshua 1:1–12:24
(20, 16),  -- Fall of Jericho → Joshua 6:1-27
(21, 17),  -- Period of the Judges → Judges 2:6-23
(22, 18),  -- Deborah Defeats Sisera → Judges 4:1–5:31
(23, 19),  -- Gideon Defeats Midian → Judges 7:1-25
(24, 386), -- Ark Captured by Philistines → 1 Samuel 4:1-11
-- United Kingdom (events 25–30)
(25, 20),  -- Saul Anointed King → 1 Samuel 10:1-27
(26, 21),  -- David Anointed King → 2 Samuel 5:1-5
(27, 22),  -- David Captures Jerusalem → 2 Samuel 5:6-10
(28, 23),  -- Davidic Covenant → 2 Samuel 7:1-29
(29, 24),  -- Solomon Builds Temple → 1 Kings 6:1-38
(30, 25),  -- Kingdom Divides → 1 Kings 12:1-24
-- Divided Kingdom (events 31–34)
(31, 26),  -- Elijah on Mount Carmel → 1 Kings 18:20-40
(32, 27),  -- Fall of Samaria → 2 Kings 17:1-41
(33, 28),  -- Hezekiah's Deliverance → 2 Kings 19:1-37
(34, 29),  -- Josiah's Reforms → 2 Kings 22:8–23:25
-- Exile & Return (events 35–41)
(35, 30),  -- Fall of Jerusalem → 2 Kings 25:1-21
(36, 31),  -- Babylonian Exile → Lamentations 1:1–5:22
(37, 32),  -- Edict of Cyrus → Ezra 1:1-11
(38, 33),  -- Second Temple Built → Ezra 6:14-22
(39, 34),  -- Ezra's Return → Ezra 7:1–10:44
(40, 35),  -- Nehemiah Rebuilds Walls → Nehemiah 2:11–6:19
(41, 36),  -- Esther Saves Her People → Esther 4:1–9:32
-- Life of Christ (events 42–47)
(42, 37),  -- Birth of Jesus → Luke 2:1-20
(43, 38),  -- Baptism of Jesus → Matthew 3:13-17
(44, 39),  -- Sermon on the Mount → Matthew 5:1–7:29
(45, 40),  -- Crucifixion → Matthew 27:32-56
(46, 41),  -- Resurrection → Matthew 28:1-10
(47, 42),  -- Ascension → Acts 1:9-11
-- Apostolic Age (events 48–57)
(48, 43),  -- Pentecost → Acts 2:1-47
(49, 44),  -- Stoning of Stephen → Acts 7:54-60
(50, 45),  -- Conversion of Paul → Acts 9:1-31
(51, 46),  -- Paul's First Missionary Journey → Acts 13:1–14:28
(52, 47),  -- Council of Jerusalem → Acts 15:1-35
(53, 48),  -- Paul's Second Missionary Journey → Acts 15:36–18:22
(54, 49),  -- Paul's Third Missionary Journey → Acts 18:23–21:16
(55, 50),  -- Destruction of Jerusalem → Luke 21:5-36
(56, 51),  -- John Writes Revelation → Revelation 1:1–22:21
(57, 52),  -- Death of John → John 21:20-25
-- Miracles of Jesus (events 58–94)
(58, 100),  -- Water Turned to Wine → John 2:1-11
(59, 101),  -- Healing of the Official's Son → John 4:46-54
(60, 102),  -- Great Catch of Fish → Luke 5:1-11
(61, 103),  -- Demon in Capernaum → Mark 1:21-28
(62, 104),  -- Peter's Mother-in-Law → Matthew 8:14-15
(63, 105),  -- Cleansing of a Leper → Matthew 8:1-4
(64, 106),  -- Healing of the Paralytic → Mark 2:1-12
(65, 107),  -- Healing at Pool of Bethesda → John 5:1-17
(66, 108),  -- Healing of a Withered Hand → Matthew 12:9-14
(67, 109),  -- Centurion's Servant → Matthew 8:5-13
(68, 110),  -- Widow's Son at Nain → Luke 7:11-17
(69, 111),  -- Calming the Storm → Mark 4:35-41
(70, 112),  -- Gerasene Demoniac → Mark 5:1-20
(71, 113),  -- Woman with Issue of Blood → Mark 5:25-34
(72, 114),  -- Raising of Jairus' Daughter → Mark 5:21-43
(73, 115),  -- Healing of Two Blind Men → Matthew 9:27-31
(74, 116),  -- Healing of a Mute Man → Matthew 9:32-34
(75, 117),  -- Feeding of the 5,000 → John 6:1-15
(76, 118),  -- Walking on Water → Matthew 14:22-33
(77, 119),  -- Syrophoenician Woman's Daughter → Matthew 15:21-28
(78, 120),  -- Deaf and Mute Man → Mark 7:31-37
(79, 121),  -- Feeding of the 4,000 → Matthew 15:32-39
(80, 122),  -- Blind Man at Bethsaida → Mark 8:22-26
(81, 123),  -- Transfiguration → Matthew 17:1-13
(82, 124),  -- Boy with a Demon → Mark 9:14-29
(83, 134),  -- Coin in the Fish's Mouth → Matthew 17:24-27
(84, 125),  -- Man Born Blind → John 9:1-41
(85, 126),  -- Crippled Woman → Luke 13:10-17
(86, 127),  -- Man with Dropsy → Luke 14:1-6
(87, 128),  -- Raising of Lazarus → John 11:1-44
(88, 129),  -- Healing of Ten Lepers → Luke 17:11-19
(89, 130),  -- Healing of Blind Bartimaeus → Mark 10:46-52
(90, 135),  -- Two Blind Men at Jericho → Matthew 20:29-34
(91, 131),  -- Cursing of the Fig Tree → Matthew 21:18-22
(92, 132),  -- Healing of Malchus' Ear → Luke 22:49-51
(93, 133),  -- Catch of 153 Fish → John 21:1-14
(94, 137),  -- Healing of Naaman → 2 Kings 5:1-27
-- Parallel Gospel references for Life of Christ events
(42, 237),  -- Birth of Jesus (Matthew 1:18–2:23)
(43, 238),  -- Baptism of Jesus (Mark 1:9-11)
(43, 239),  -- Baptism of Jesus (Luke 3:21-22)
(43, 240),  -- Baptism of Jesus (John 1:29-34)
(44, 241),  -- Sermon on the Mount/Plain (Luke 6:17-49)
(45, 242),  -- Crucifixion (Mark 15:21-41)
(45, 243),  -- Crucifixion (Luke 23:26-49)
(45, 244),  -- Crucifixion (John 19:17-37)
(46, 245),  -- Resurrection (Mark 16:1-8)
(46, 246),  -- Resurrection (Luke 24:1-12)
(46, 247),  -- Resurrection (John 20:1-18)
(47, 248),  -- Ascension (Luke 24:50-53)
(47, 249),  -- Ascension (Mark 16:19-20)
-- Parallel miracle references
(61, 250),  -- Demon in Capernaum (Luke 4:31-37)
(62, 251),  -- Peter's Mother-in-Law (Mark 1:29-31)
(62, 252),  -- Peter's Mother-in-Law (Luke 4:38-39)
(63, 253),  -- Cleansing a Leper (Mark 1:40-45)
(63, 254),  -- Cleansing a Leper (Luke 5:12-16)
(64, 255),  -- Healing the Paralytic (Matthew 9:1-8)
(64, 256),  -- Healing the Paralytic (Luke 5:17-26)
(66, 257),  -- Withered Hand (Mark 3:1-6)
(66, 258),  -- Withered Hand (Luke 6:6-11)
(67, 259),  -- Centurion's Servant (Luke 7:1-10)
(69, 260),  -- Calming the Storm (Matthew 8:23-27)
(69, 261),  -- Calming the Storm (Luke 8:22-25)
(70, 262),  -- Gerasene Demoniac (Matthew 8:28-34)
(70, 263),  -- Gerasene Demoniac (Luke 8:26-39)
(71, 264),  -- Woman with Issue of Blood (Matthew 9:20-22)
(71, 265),  -- Woman with Issue of Blood (Luke 8:43-48)
(72, 266),  -- Jairus' Daughter (Matthew 9:18-26)
(72, 267),  -- Jairus' Daughter (Luke 8:40-56)
(75, 268),  -- Feeding 5000 (Matthew 14:13-21)
(75, 269),  -- Feeding 5000 (Mark 6:30-44)
(75, 270),  -- Feeding 5000 (Luke 9:10-17)
(76, 271),  -- Walking on Water (Mark 6:45-52)
(76, 272),  -- Walking on Water (John 6:16-21)
(77, 273),  -- Syrophoenician Daughter (Mark 7:24-30)
(79, 274),  -- Feeding 4000 (Mark 8:1-10)
(81, 275),  -- Transfiguration (Mark 9:2-13)
(81, 276),  -- Transfiguration (Luke 9:28-36)
(82, 277),  -- Boy with a Demon (Matthew 17:14-21)
(82, 278),  -- Boy with a Demon (Luke 9:37-43)
(89, 279),  -- Blind Bartimaeus (Matthew 20:29-34)
(89, 280),  -- Blind Bartimaeus (Luke 18:35-43)
(91, 281),  -- Cursing the Fig Tree (Mark 11:12-25)
(92, 282),  -- Malchus' Ear (John 18:10-11)
-- OT parallel accounts
(35, 283),  -- Fall of Jerusalem (2 Chronicles 36:1-23)
(35, 284),  -- Fall of Jerusalem (Jeremiah 52:1-34)
(33, 285),  -- Hezekiah's Deliverance (2 Chronicles 32:1-23)
(33, 286),  -- Hezekiah's Deliverance (Isaiah 36:1–37:38)
(34, 287),  -- Josiah's Reforms (2 Chronicles 34:1–35:27)
(25, 288),  -- Saul Anointed (1 Chronicles 10:1-14)
(26, 289),  -- David Anointed King (1 Chronicles 11:1-9)
(28, 290),  -- Davidic Covenant (1 Chronicles 17:1-27)
(29, 291),  -- Solomon Builds Temple (2 Chronicles 3:1–7:22)
(30, 292);  -- Kingdom Divides (2 Chronicles 10:1-19)
-- Post-Resurrection appearances
INSERT INTO event_scripture (event_id, scripture_id) VALUES
(143, 387), -- Appearance to Mary Magdalene → John 20:11-18
(143, 388), -- Appearance to Mary Magdalene → Mark 16:9-11
(144, 389), -- Road to Emmaus → Luke 24:13-35
(144, 390), -- Road to Emmaus → Mark 16:12-13
(145, 391), -- Appearance to Disciples → John 20:19-25
(145, 392), -- Appearance to Disciples → Luke 24:36-43
(146, 393), -- Appearance to Thomas → John 20:26-29
(147, 394), -- Restoration of Peter → John 21:15-19
(148, 395), -- Great Commission → Matthew 28:16-20
(148, 396); -- Great Commission → Mark 16:15-18
-- NT Books Written
INSERT INTO event_scripture (event_id, scripture_id) VALUES
(149, 397), -- James Written → James 1:1
(150, 398), -- Galatians Written → Galatians 1:1-5
(151, 399), -- 1 Thessalonians Written → 1 Thessalonians 1:1
(152, 400), -- 2 Thessalonians Written → 2 Thessalonians 1:1-2
(153, 401), -- 1 Corinthians Written → 1 Corinthians 1:1-3
(154, 402), -- Matthew Written → Matthew 1:1
(155, 403), -- Mark Written → Mark 1:1
(156, 404), -- 2 Corinthians Written → 2 Corinthians 1:1-2
(157, 405), -- Romans Written → Romans 1:1-7
(158, 406), -- Luke Written → Luke 1:1-4
(159, 407), -- Ephesians Written → Ephesians 1:1-2
(160, 408), -- Colossians Written → Colossians 1:1-2
(161, 409), -- Philemon Written → Philemon 1-3
(162, 410), -- Philippians Written → Philippians 1:1-2
(163, 411), -- Acts Written → Acts 1:1-2
(164, 412), -- 1 Timothy Written → 1 Timothy 1:1-2
(165, 413), -- Titus Written → Titus 1:1-4
(166, 414), -- 1 Peter Written → 1 Peter 1:1-2
(167, 415), -- Jude Written → Jude 1-2
(168, 416), -- Hebrews Written → Hebrews 1:1-4
(169, 417), -- 2 Timothy Written → 2 Timothy 1:1-2
(170, 418), -- 2 Peter Written → 2 Peter 1:1-2
(171, 419), -- John Written → John 1:1-5
(172, 420), -- 1 John Written → 1 John 1:1-4
(173, 421), -- 2 John Written → 2 John 1-3
(174, 422); -- 3 John Written → 3 John 1-4

-- Link people to scripture (all 47 people)
INSERT INTO person_scripture (person_id, scripture_id) VALUES
(1, 53),   -- Adam
(2, 54),   -- Eve
(3, 55),   -- Noah
(4, 56),   -- Abraham
(5, 57),   -- Sarah
(6, 58),   -- Isaac
(7, 59),   -- Rebekah
(8, 60),   -- Jacob
(9, 61),   -- Joseph
(10, 62),  -- Moses
(11, 63),  -- Aaron
(12, 64),  -- Miriam
(13, 65),  -- Joshua
(14, 66),  -- Deborah
(15, 67),  -- Gideon
(16, 68),  -- Samson
(17, 69),  -- Ruth
(18, 70),  -- Samuel
(19, 71),  -- Saul
(20, 72),  -- David
(21, 73),  -- Solomon
(22, 74),  -- Nathan
(23, 75),  -- Elijah
(24, 76),  -- Elisha
(25, 77),  -- Isaiah
(26, 78),  -- Jeremiah
(27, 79),  -- Ezekiel
(28, 80),  -- Daniel
(29, 81),  -- Hezekiah
(30, 82),  -- Josiah
(31, 83),  -- Jeroboam
(32, 84),  -- Ahab
(33, 85),  -- Ezra
(34, 86),  -- Nehemiah
(35, 87),  -- Zerubbabel
(36, 88),  -- Esther
(37, 89),  -- Jesus
(38, 90),  -- Mary
(39, 91),  -- John the Baptist
(40, 92),  -- Peter
(41, 93),  -- Paul
(42, 94),  -- John the Apostle
(43, 95),  -- James son of Zebedee
(44, 96),  -- Stephen
(45, 97),  -- Barnabas
(46, 98),  -- Timothy
(47, 99),  -- Luke
(48, 136), -- Naaman
-- New people (IDs 49-148 → scripture IDs 138-236)
(49, 138),  -- Seth
(50, 139),  -- Enoch
(51, 140),  -- Methuselah
(52, 141),  -- Lamech
(53, 142),  -- Shem
(54, 143),  -- Ham
(55, 144),  -- Japheth
(56, 145),  -- Lot
(57, 146),  -- Ishmael
(58, 147),  -- Hagar
(59, 148),  -- Esau
(60, 149),  -- Laban
(61, 150),  -- Leah
(62, 151),  -- Rachel
(63, 152),  -- Judah
(64, 153),  -- Benjamin
(65, 154),  -- Reuben
(66, 155),  -- Pharaoh of Exodus
(67, 156),  -- Caleb
(68, 157),  -- Phinehas
(69, 158),  -- Jethro
(70, 159),  -- Zipporah
(71, 160),  -- Othniel
(72, 161),  -- Ehud
(73, 162),  -- Jephthah
(74, 163),  -- Eli
(75, 164),  -- Hannah
(76, 165),  -- Boaz
(77, 166),  -- Naomi
(78, 167),  -- Abimelech
(79, 168),  -- Abigail
(80, 169),  -- Bathsheba
(81, 170),  -- Joab
(82, 171),  -- Absalom
(83, 172),  -- Jonathan
(84, 173),  -- Michal
(85, 174),  -- Rehoboam
(86, 175),  -- Asa
(87, 176),  -- Jehoshaphat
(88, 177),  -- Jehoram of Judah
(89, 178),  -- Uzziah
(90, 179),  -- Ahaz
(91, 180),  -- Manasseh
(92, 181),  -- Jehoiakim
(93, 182),  -- Zedekiah
(94, 183),  -- Athaliah
(95, 184),  -- Joash of Judah
(96, 185),  -- Amaziah
(97, 186),  -- Jotham
(98, 187),  -- Nadab
(99, 188),  -- Baasha
(100, 189), -- Omri
(101, 190), -- Ahaziah of Israel
(102, 191), -- Jehoram of Israel
(103, 192), -- Jehu
(104, 193), -- Jeroboam II
(105, 194), -- Hoshea
(106, 195), -- Zimri
(107, 196), -- Jezebel
(108, 197), -- Hosea (prophet)
(109, 198), -- Joel
(110, 199), -- Amos
(111, 200), -- Obadiah
(112, 201), -- Jonah
(113, 202), -- Micah
(114, 203), -- Nahum
(115, 204), -- Habakkuk
(116, 205), -- Zephaniah
(117, 206), -- Haggai
(118, 207), -- Zechariah (prophet)
(119, 208), -- Malachi
(120, 209), -- Mordecai
(121, 210), -- Job
(122, 211), -- Joseph of Nazareth
(123, 212), -- Lazarus
(124, 213), -- Martha
(125, 214), -- Mary Magdalene
(126, 215), -- Nicodemus
(127, 216), -- Matthew/Levi
(128, 217), -- Andrew
(129, 218), -- Philip
(130, 219), -- Bartholomew/Nathanael
(131, 220), -- Thomas
(132, 221), -- James son of Alphaeus
(133, 222), -- Thaddaeus
(134, 223), -- Simon the Zealot
(135, 224), -- Judas Iscariot
(136, 225), -- Matthias
(137, 226), -- Mark
(138, 227), -- Silas
(139, 228), -- Titus
(140, 229), -- Priscilla
(141, 230), -- Aquila
(142, 231), -- Apollos
(143, 232), -- Philemon
(144, 233), -- James brother of Jesus
(145, 234), -- Herod the Great
(146, 235), -- Pontius Pilate
(147, 236), -- Anna
-- Gen 5/11 ancestors (IDs 148-159 → scripture IDs 293-304)
(148, 293), -- Enosh
(149, 294), -- Kenan
(150, 295), -- Mahalalel
(151, 296), -- Jared
(152, 297), -- Arphaxad
(153, 298), -- Salah
(154, 299), -- Eber
(155, 300), -- Peleg
(156, 301), -- Reu
(157, 302), -- Serug
(158, 303), -- Nahor
(159, 304), -- Terah
-- 100 Additional People → scripture refs
(160, 305), -- Cain
(161, 305), -- Abel (same chapter)
(161, 306), -- Abel murdered
(162, 307), -- Dinah
(163, 307), -- Simeon (in Dinah incident)
(164, 307), -- Levi (in Dinah incident)
(171, 309), -- Manasseh son of Joseph
(172, 309), -- Ephraim
(173, 308), -- Tamar
(174, 308), -- Perez
(176, 310), -- Melchizedek (Genesis)
(176, 311), -- Melchizedek (Hebrews)
(177, 312), -- Potiphar
(175, 313), -- Keturah
(179, 314), -- Korah
(180, 315), -- Balaam
(182, 316), -- Rahab (Joshua)
(182, 317), -- Rahab (Hebrews)
(183, 318), -- Achan
(185, 319), -- Hur
(186, 320), -- Bezalel
(184, 321), -- Eleazar
(189, 322), -- Barak
(190, 323), -- Jael
(191, 323), -- Sisera
(192, 324), -- Manoah
(193, 325), -- Delilah
(199, 326), -- Ish-bosheth
(200, 327), -- Abner
(201, 328), -- Mephibosheth
(202, 329), -- Uriah
(203, 330), -- Hiram
(204, 331), -- Adonijah
(205, 332), -- Shimei
(206, 333), -- Hushai
(207, 334), -- Ahithophel
(208, 335), -- Zadok
(209, 336), -- Widow of Zarephath
(210, 337), -- Gehazi
(211, 338), -- Shunammite Woman
(212, 339), -- Hazael
(213, 340), -- Sennacherib
(218, 341), -- Shadrach
(219, 341), -- Meshach
(220, 341), -- Abednego
(218, 342), -- Shadrach (furnace)
(219, 342), -- Meshach (furnace)
(220, 342), -- Abednego (furnace)
(215, 343), -- Belshazzar
(216, 344), -- Cyrus (Isaiah)
(216, 345), -- Cyrus (Chronicles)
(217, 346), -- Darius
(221, 347), -- Nabal
(222, 348), -- Huldah
(223, 349), -- Hilkiah
(224, 350), -- Sanballat
(226, 351), -- Haman
(227, 352), -- Vashti
(229, 353), -- Simeon at Temple
(230, 354), -- Zechariah
(231, 355), -- Elizabeth
(232, 356), -- Herod Antipas
(234, 357), -- Salome
(235, 358), -- Caiaphas
(236, 359), -- Annas
(237, 360), -- Barabbas
(238, 361), -- Joseph of Arimathea
(239, 362), -- Simon of Cyrene
(240, 363), -- Zacchaeus
(241, 364), -- Jairus
(242, 365), -- Cleopas
(243, 366), -- Mary of Bethany
(244, 367), -- Ananias of Damascus
(245, 368), -- Cornelius
(246, 369), -- Lydia
(247, 370), -- Gamaliel
(248, 371), -- Agabus
(249, 372), -- Dorcas
(250, 373), -- Philip the Evangelist
(252, 374), -- Onesimus
(253, 375), -- Rhoda
(254, 376), -- Herod Agrippa I
(255, 377), -- Herod Agrippa II
(256, 378), -- Felix
(257, 379), -- Festus
(258, 380), -- Ananias and Sapphira
(259, 381); -- Phoebe

-- ============================================================
-- LINEAGE OF JESUS — Matthew 1 & Luke 3
-- Complete genealogical chain from Adam to Jesus
-- ============================================================

-- Matthew 1 additions (missing links in the royal/legal line)
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
('Abijah', 'Abijam', -958, -955, 1, 1, 'probable', 'king', 'minor', 'Judah', 85, NULL, 'King of Judah, son of Rehoboam. Reigned 3 years. Ancestor of Jesus in Matthew 1:7.', 'Ussher: reigned 958–955 BC (3 years, 1 Kings 15:1–2). Not to be confused with Abijah the priest.'),
('Shealtiel', 'Salathiel', -595, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 269, NULL, 'Son of Jeconiah (Jehoiachin), father of Zerubbabel. Exilic-period ancestor of Jesus (Matt 1:12, Luke 3:27).', 'Exilic period. Born during Babylonian captivity after Jeconiah''s exile in 597 BC.'),
('Abiud', NULL, -520, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 35, NULL, 'Son of Zerubbabel, ancestor of Jesus in Matthew 1:13. Post-exilic figure.', 'Post-exilic period. Known only from Matthew''s genealogy.'),
('Eliakim', NULL, -490, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 272, NULL, 'Son of Abiud, ancestor of Jesus in Matthew 1:13. Post-exilic figure.', 'Known only from Matthew''s genealogy. Not the Eliakim of 2 Kings 18.'),
('Azor', NULL, -460, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 273, NULL, 'Son of Eliakim, ancestor of Jesus in Matthew 1:13–14.', 'Known only from Matthew''s genealogy.'),
('Zadok', NULL, -430, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 274, NULL, 'Son of Azor, ancestor of Jesus in Matthew 1:14. Not the priest Zadok of David''s time.', 'Known only from Matthew''s genealogy. Not to be confused with Zadok the priest (2 Sam 8:17).'),
('Achim', 'Jachin', -400, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 275, NULL, 'Son of Zadok, ancestor of Jesus in Matthew 1:14.', 'Known only from Matthew''s genealogy. Intertestamental period.'),
('Eliud', NULL, -370, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 276, NULL, 'Son of Achim, ancestor of Jesus in Matthew 1:14–15.', 'Known only from Matthew''s genealogy. Intertestamental period.'),
('Eleazar', NULL, -340, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 277, NULL, 'Son of Eliud, ancestor of Jesus in Matthew 1:15. Not the priest Eleazar son of Aaron.', 'Known only from Matthew''s genealogy. Not to be confused with Eleazar the priest (Num 20:28).'),
('Matthan', NULL, -100, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 278, NULL, 'Son of Eleazar, grandfather of Joseph of Nazareth in Matthew 1:15.', 'Known only from Matthew''s genealogy. Late Second Temple period.'),
('Jacob', NULL, -70, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 279, NULL, 'Son of Matthan, father of Joseph of Nazareth in Matthew 1:15–16. Not the patriarch Jacob.', 'Known only from Matthew''s genealogy. Father of Joseph, the husband of Mary.');

-- Luke 3 additions — David to Zerubbabel via Nathan (Mary's/natural line)
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
('Nathan', NULL, -1000, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 20, 80, 'Son of David and Bathsheba. Ancestor of Jesus in Luke 3:31. Not the prophet Nathan.', '2 Samuel 5:14, 1 Chronicles 3:5. Born during David''s reign in Jerusalem. Not to be confused with Nathan the prophet (2 Sam 7).'),
('Mattatha', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 281, NULL, 'Son of Nathan, ancestor of Jesus in Luke 3:31.', 'Known only from Luke''s genealogy.'),
('Menna', 'Menan', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 282, NULL, 'Son of Mattatha, ancestor of Jesus in Luke 3:31.', 'Known only from Luke''s genealogy.'),
('Melea', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 283, NULL, 'Son of Menna, ancestor of Jesus in Luke 3:31.', 'Known only from Luke''s genealogy.'),
('Eliakim', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 284, NULL, 'Son of Melea, ancestor of Jesus in Luke 3:30. Not the Eliakim of Matthew''s line or 2 Kings 18.', 'Known only from Luke''s genealogy. Luke 3:30.'),
('Jonam', 'Jonan', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 285, NULL, 'Son of Eliakim, ancestor of Jesus in Luke 3:30.', 'Known only from Luke''s genealogy.'),
('Joseph', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 286, NULL, 'Son of Jonam, ancestor of Jesus in Luke 3:30. Not Joseph of Nazareth.', 'Known only from Luke''s genealogy. One of several Josephs in the lineage.'),
('Judah', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 287, NULL, 'Son of Joseph, ancestor of Jesus in Luke 3:30. Not the patriarch Judah son of Jacob.', 'Known only from Luke''s genealogy.'),
('Simeon', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 288, NULL, 'Son of Judah, ancestor of Jesus in Luke 3:30. Not Simeon the patriarch or Simeon at the Temple.', 'Known only from Luke''s genealogy.'),
('Levi', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 289, NULL, 'Son of Simeon, ancestor of Jesus in Luke 3:29. Not the patriarch Levi son of Jacob.', 'Known only from Luke''s genealogy.'),
('Matthat', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 290, NULL, 'Son of Levi, ancestor of Jesus in Luke 3:29.', 'Known only from Luke''s genealogy. Pre-exilic Matthat, distinct from the post-exilic Matthat.'),
('Jorim', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 291, NULL, 'Son of Matthat, ancestor of Jesus in Luke 3:29.', 'Known only from Luke''s genealogy.'),
('Eliezer', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 292, NULL, 'Son of Jorim, ancestor of Jesus in Luke 3:29. Not Eliezer servant of Abraham.', 'Known only from Luke''s genealogy.'),
('Joshua', 'Jesus', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 293, NULL, 'Son of Eliezer, ancestor of Jesus in Luke 3:29. Same name as Jesus/Joshua in Hebrew. Not Joshua of the conquest.', 'Known only from Luke''s genealogy. Greek Iesous = Hebrew Yehoshua.'),
('Er', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 294, NULL, 'Son of Joshua, ancestor of Jesus in Luke 3:28. Not Er son of Judah (Gen 38:3).', 'Known only from Luke''s genealogy.'),
('Elmadam', 'Elmodam', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 295, NULL, 'Son of Er, ancestor of Jesus in Luke 3:28.', 'Known only from Luke''s genealogy.'),
('Cosam', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 296, NULL, 'Son of Elmadam, ancestor of Jesus in Luke 3:28.', 'Known only from Luke''s genealogy.'),
('Addi', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 297, NULL, 'Son of Cosam, ancestor of Jesus in Luke 3:28.', 'Known only from Luke''s genealogy.'),
('Melchi', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 298, NULL, 'Son of Addi, ancestor of Jesus in Luke 3:28. Pre-exilic Melchi, distinct from the post-exilic Melchi.', 'Known only from Luke''s genealogy. Luke 3:28.'),
('Neri', NULL, -620, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 299, NULL, 'Son of Melchi, father of Shealtiel in Luke 3:27. Links to the exilic line.', 'Known only from Luke''s genealogy. Luke identifies Shealtiel as son of Neri rather than Jeconiah (Matt 1:12).');

-- Luke 3 additions — Zerubbabel to Joseph (post-exilic)
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
('Rhesa', NULL, -500, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 35, NULL, 'Son of Zerubbabel, ancestor of Jesus in Luke 3:27.', 'Known only from Luke''s genealogy. Post-exilic period.'),
('Joanan', 'Joannas', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 301, NULL, 'Son of Rhesa, ancestor of Jesus in Luke 3:27.', 'Known only from Luke''s genealogy.'),
('Joda', 'Judah', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 302, NULL, 'Son of Joanan, ancestor of Jesus in Luke 3:26.', 'Known only from Luke''s genealogy.'),
('Josech', 'Josec, Joseph', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 303, NULL, 'Son of Joda, ancestor of Jesus in Luke 3:26.', 'Known only from Luke''s genealogy.'),
('Semein', 'Semei', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 304, NULL, 'Son of Josech, ancestor of Jesus in Luke 3:26.', 'Known only from Luke''s genealogy.'),
('Mattathias', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 305, NULL, 'Son of Semein, ancestor of Jesus in Luke 3:26.', 'Known only from Luke''s genealogy. First of two Mattathias in Luke''s post-exilic line.'),
('Maath', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 306, NULL, 'Son of Mattathias, ancestor of Jesus in Luke 3:26.', 'Known only from Luke''s genealogy.'),
('Naggai', 'Nagge', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 307, NULL, 'Son of Maath, ancestor of Jesus in Luke 3:25.', 'Known only from Luke''s genealogy.'),
('Esli', 'Hesli', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 308, NULL, 'Son of Naggai, ancestor of Jesus in Luke 3:25.', 'Known only from Luke''s genealogy.'),
('Nahum', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 309, NULL, 'Son of Esli, ancestor of Jesus in Luke 3:25. Not the prophet Nahum.', 'Known only from Luke''s genealogy. Not to be confused with the prophet Nahum (Nah 1:1).'),
('Amos', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 310, NULL, 'Son of Nahum, ancestor of Jesus in Luke 3:25. Not the prophet Amos.', 'Known only from Luke''s genealogy. Not to be confused with the prophet Amos (Amos 1:1).'),
('Mattathias', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 311, NULL, 'Son of Amos, ancestor of Jesus in Luke 3:25. Second Mattathias in Luke''s post-exilic line.', 'Known only from Luke''s genealogy. Luke 3:25.'),
('Joseph', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 312, NULL, 'Son of Mattathias, ancestor of Jesus in Luke 3:24. Not Joseph of Nazareth.', 'Known only from Luke''s genealogy. One of several Josephs in the lineage.'),
('Jannai', 'Janna', NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 313, NULL, 'Son of Joseph, ancestor of Jesus in Luke 3:24.', 'Known only from Luke''s genealogy.'),
('Melchi', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 314, NULL, 'Son of Jannai, ancestor of Jesus in Luke 3:24. Post-exilic Melchi, distinct from the pre-exilic Melchi.', 'Known only from Luke''s genealogy. Luke 3:24.'),
('Levi', NULL, NULL, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 315, NULL, 'Son of Melchi, ancestor of Jesus in Luke 3:24. Not the patriarch Levi son of Jacob.', 'Known only from Luke''s genealogy.'),
('Matthat', NULL, -80, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 316, NULL, 'Son of Levi, ancestor of Jesus in Luke 3:24. Post-exilic Matthat, grandfather of Joseph.', 'Known only from Luke''s genealogy. Late Second Temple period.'),
('Heli', 'Eli', -60, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 317, NULL, 'Father of Joseph in Luke 3:23. Traditionally understood as Mary''s father or Joseph''s father-in-law.', 'Known only from Luke''s genealogy. Some scholars identify Heli as Mary''s father, making Luke''s genealogy the natural/maternal line.');

-- ── Brothers of Jesus (Mark 6:3) ────────────────────────────
-- IDs 319-321: Joses, Simon, Judas/Jude
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes)
VALUES
('Joses', 'Jose', 0, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 122, 38, 'Brother of Jesus mentioned in Mark 6:3 and Matthew 13:55.', 'Mark 6:3; Matthew 13:55.'),
('Simon', NULL, 2, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 122, 38, 'Brother of Jesus mentioned in Mark 6:3 and Matthew 13:55. Not to be confused with Simon Peter or Simon the Zealot.', 'Mark 6:3; Matthew 13:55.'),
('Judas', 'Jude', 3, NULL, 1, 1, 'traditional', 'other', 'minor', 'Judah', 122, 38, 'Brother of Jesus mentioned in Mark 6:3 and Matthew 13:55. Traditionally identified as the author of the Epistle of Jude.', 'Mark 6:3; Matthew 13:55; Jude 1:1.');

-- ── Update existing records to link into Jesus's genealogy ────

-- Fix Asa's father: was set to Rehoboam (85), should be Abijah (270)
UPDATE people SET father_id = 270 WHERE id = 86;                -- Asa → Abijah (not directly Rehoboam)

-- Link Zerubbabel to Shealtiel
UPDATE people SET father_id = 271 WHERE id = 35;                -- Zerubbabel → Shealtiel

-- Link Joseph of Nazareth to Jacob (Matthew's genealogy)
UPDATE people SET father_id = 280 WHERE id = 122;               -- Joseph of Nazareth → Jacob (Matt 1:16)

-- ── Lineage of Jesus — person_relationships ──────────────────

INSERT INTO person_relationships (person_id_1, person_id_2, relationship_type) VALUES
-- Abijah (King of Judah)
(85, 270, 'parent'),   -- Rehoboam → Abijah
(270, 85, 'child'),    -- Abijah → Rehoboam
(270, 86, 'parent'),   -- Abijah → Asa
(86, 270, 'child'),    -- Asa → Abijah

-- Shealtiel
(269, 271, 'parent'),  -- Jehoiachin → Shealtiel
(271, 269, 'child'),   -- Shealtiel → Jehoiachin
(271, 35, 'parent'),   -- Shealtiel → Zerubbabel
(35, 271, 'child'),    -- Zerubbabel → Shealtiel

-- Jacob father of Joseph
(280, 122, 'parent'),  -- Jacob → Joseph of Nazareth
(122, 280, 'child'),   -- Joseph → Jacob

-- Nathan son of David
(20, 281, 'parent'),   -- David → Nathan
(281, 20, 'child'),    -- Nathan → David
(80, 281, 'parent'),   -- Bathsheba → Nathan
(281, 80, 'child'),    -- Nathan → Bathsheba
(281, 21, 'sibling'),  -- Nathan & Solomon (half-brothers via Bathsheba)
(21, 281, 'sibling'),  -- Solomon & Nathan

-- Heli (father/father-in-law of Joseph)
(318, 122, 'parent'),  -- Heli → Joseph of Nazareth (Luke's genealogy)
(122, 318, 'child'),   -- Joseph → Heli

-- Brothers of Jesus (Mark 6:3)
(122, 319, 'parent'),  -- Joseph → Joses
(319, 122, 'child'),   -- Joses → Joseph
(38, 319, 'parent'),   -- Mary → Joses
(319, 38, 'child'),    -- Joses → Mary
(122, 320, 'parent'),  -- Joseph → Simon
(320, 122, 'child'),   -- Simon → Joseph
(38, 320, 'parent'),   -- Mary → Simon
(320, 38, 'child'),    -- Simon → Mary
(122, 321, 'parent'),  -- Joseph → Judas/Jude
(321, 122, 'child'),   -- Judas/Jude → Joseph
(38, 321, 'parent'),   -- Mary → Judas/Jude
(321, 38, 'child'),    -- Judas/Jude → Mary
(37, 319, 'sibling'),  -- Jesus & Joses
(319, 37, 'sibling'),
(37, 320, 'sibling'),  -- Jesus & Simon
(320, 37, 'sibling'),
(37, 321, 'sibling'),  -- Jesus & Judas/Jude
(321, 37, 'sibling'),
(144, 319, 'sibling'), -- James & Joses
(319, 144, 'sibling'),
(144, 320, 'sibling'), -- James & Simon
(320, 144, 'sibling'),
(144, 321, 'sibling'), -- James & Judas/Jude
(321, 144, 'sibling'),
(319, 320, 'sibling'), -- Joses & Simon
(320, 319, 'sibling'),
(319, 321, 'sibling'), -- Joses & Judas/Jude
(321, 319, 'sibling'),
(320, 321, 'sibling'), -- Simon & Judas/Jude
(321, 320, 'sibling');

-- ── Bethany family — father of Lazarus, Martha, Mary of Bethany ──
-- The Bible does not name their father, but identifies the three as siblings
-- (John 11:1-2, 19, 21; Luke 10:38-42). We create a placeholder parent so
-- the family tree renders correctly.
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx,
    date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes)
VALUES ('Father of Lazarus', 'Father of Martha and Mary', -40, NULL, 1, 1,
    'possible', 'other', 'minor', NULL, NULL, NULL,
    'Unnamed father of Lazarus, Martha, and Mary of Bethany. Not named in Scripture.',
    'Dates estimated based on children''s lifetimes.');

-- Link the three siblings to their father
UPDATE people SET father_id = (SELECT id FROM people WHERE name = 'Father of Lazarus') WHERE id = 123; -- Lazarus
UPDATE people SET father_id = (SELECT id FROM people WHERE name = 'Father of Lazarus') WHERE id = 124; -- Martha
UPDATE people SET father_id = (SELECT id FROM people WHERE name = 'Father of Lazarus') WHERE id = 243; -- Mary of Bethany

-- ============================================================
-- CHURCH HISTORY PEOPLE (IDs 323–357)
-- ============================================================
INSERT INTO people (name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, tribe, father_id, mother_id, description, date_notes) VALUES
-- Early Church & Persecution
('Ignatius of Antioch', NULL, 35, 108, 1, 0, 'probable', 'other', 'moderate', NULL, NULL, NULL, 'Bishop of Antioch and early Church Father. His seven letters on church order, the Eucharist, and martyrdom are among the earliest post-apostolic writings.', 'Born c. 35 AD; martyred c. 108 AD in Rome under Trajan.'),
('Polycarp of Smyrna', NULL, 69, 155, 1, 0, 'probable', 'other', 'moderate', NULL, NULL, NULL, 'Bishop of Smyrna and disciple of the Apostle John. Martyred at age 86, declaring "Eighty-six years I have served Him."', 'Born c. 69 AD; martyred c. 155 AD (some sources say 167).'),
('Irenaeus of Lyon', NULL, 130, 202, 1, 1, 'probable', 'other', 'moderate', NULL, NULL, NULL, 'Bishop of Lyon; student of Polycarp. His work Against Heresies is foundational for Christian orthodoxy and established the importance of apostolic succession.', 'Born c. 130 in Smyrna; died c. 202 in Lyon.'),
('Origen of Alexandria', NULL, 185, 253, 0, 0, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Prolific scholar and head of the catechetical school in Alexandria. Pioneered biblical criticism and allegorical interpretation. His Hexapla was the first side-by-side Bible.', 'Born c. 185 in Alexandria; died c. 253 in Tyre.'),
('Tertullian', 'Quintus Septimius Florens Tertullianus', 155, 220, 1, 1, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Church Father in Carthage. Coined the term "Trinity" (trinitas) and many other theological Latin terms. Later joined the Montanist movement.', 'Born c. 155 in Carthage; died c. 220.'),

-- Imperial Christianity
('Athanasius of Alexandria', NULL, 296, 373, 1, 0, 'probable', 'other', 'major', NULL, NULL, NULL, 'Bishop of Alexandria and champion of Nicene orthodoxy. Exiled five times for defending the deity of Christ. Listed the 27-book NT canon in his 39th Festal Letter (367 AD).', 'Born c. 296; died May 2, 373.'),
('Jerome', 'Eusebius Sophronius Hieronymus', 347, 420, 0, 0, 'probable', 'other', 'major', NULL, NULL, NULL, 'Scholar, priest, and translator. Produced the Latin Vulgate — the standard Bible of the Western church for over 1,000 years.', 'Born c. 347 in Stridon; died September 30, 420 in Bethlehem.'),
('Augustine of Hippo', 'Aurelius Augustinus', 354, 430, 0, 0, 'certain', 'other', 'major', NULL, NULL, NULL, 'Bishop of Hippo and the most influential Western theologian. His Confessions and City of God shaped Christian thought for centuries. Key architect of doctrines of grace, original sin, and the church.', 'Born November 13, 354 in Thagaste; died August 28, 430 in Hippo.'),

-- Early Medieval
('Benedict of Nursia', NULL, 480, 547, 1, 1, 'probable', 'other', 'moderate', NULL, NULL, NULL, 'Father of Western monasticism. His Rule of St. Benedict — "ora et labora" (pray and work) — became the foundation for monastic communities that preserved learning through the Dark Ages.', 'Born c. 480 in Nursia; died c. 547 at Monte Cassino.'),
('Patrick of Ireland', 'Patricius', 385, 461, 1, 1, 'probable', 'other', 'minor', NULL, NULL, NULL, 'Missionary to Ireland. Captured as a slave at 16, he escaped and later returned to evangelize the Irish. His mission transformed Ireland into a center of Christian learning.', 'Born c. 385 in Roman Britain; died c. 461.'),

-- High Medieval
('Francis of Assisi', 'Giovanni di Pietro di Bernardone', 1182, 1226, 0, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'Founder of the Franciscan Order. Renounced wealth to live in radical poverty and preached to the poor. Received the stigmata (1224). Patron saint of animals and ecology.', 'Born 1181 or 1182 in Assisi; died October 3, 1226.'),
('Thomas Aquinas', NULL, 1225, 1274, 0, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'Dominican friar and the greatest medieval theologian. His Summa Theologiae synthesized faith and reason, integrating Aristotelian philosophy with Christian theology.', 'Born 1225 in Roccasecca; died March 7, 1274.'),
('John Wycliffe', NULL, 1328, 1384, 1, 0, 'probable', 'other', 'major', NULL, NULL, NULL, 'English theologian and "Morning Star of the Reformation." Produced the first complete English Bible (from the Vulgate). Challenged papal authority and the sale of indulgences a century before Luther.', 'Born c. 1328 in Yorkshire; died December 31, 1384.'),
('Jan Hus', 'John Hus', 1372, 1415, 1, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'Czech reformer and rector of the University of Prague. Influenced by Wycliffe, he preached in the common language and challenged papal authority. Burned at the stake at the Council of Constance.', 'Born c. 1372; burned July 6, 1415.'),

-- Reformation
('Johannes Gutenberg', NULL, 1400, 1468, 1, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'Inventor of the mechanical movable-type printing press. His Gutenberg Bible (c. 1455) revolutionized the spread of Scripture and made the Reformation possible.', 'Born c. 1400 in Mainz; died February 3, 1468.'),
('Martin Luther', NULL, 1483, 1546, 0, 0, 'certain', 'other', 'major', NULL, NULL, NULL, 'German monk and professor who ignited the Protestant Reformation by posting the 95 Theses (1517). Translated the Bible into German. Key doctrines: sola fide, sola scriptura, sola gratia.', 'Born November 10, 1483; died February 18, 1546.'),
('William Tyndale', NULL, 1494, 1536, 1, 0, 'certain', 'other', 'major', NULL, NULL, NULL, 'English scholar who produced the first printed English New Testament from the Greek (1526). Strangled and burned at the stake. 80% of his phrasing survives in the King James Version.', 'Born c. 1494; executed October 6, 1536 near Brussels.'),
('John Calvin', 'Jean Cauvin', 1509, 1564, 0, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'French theologian and reformer. His Institutes of the Christian Religion (1536) is the foundational text of Reformed theology. Led the church in Geneva.', 'Born July 10, 1509; died May 27, 1564.'),
('John Knox', NULL, 1514, 1572, 1, 0, 'certain', 'other', 'minor', NULL, NULL, NULL, 'Scottish reformer and founder of Presbyterianism. His preaching transformed Scotland from a Catholic to a Protestant nation.', 'Born c. 1514; died November 24, 1572.'),

-- Enlightenment & Missions
('John Wesley', NULL, 1703, 1791, 0, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'Anglican clergyman and founder of the Methodist movement. His heart was "strangely warmed" at Aldersgate Street (1738). Traveled 250,000 miles and preached 40,000 sermons.', 'Born June 28, 1703; died March 2, 1791.'),
('Jonathan Edwards', NULL, 1703, 1758, 0, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'American theologian and preacher of the First Great Awakening. His sermon "Sinners in the Hands of an Angry God" (1741) is one of the most famous in history.', 'Born October 5, 1703; died March 22, 1758.'),
('William Carey', NULL, 1761, 1834, 0, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'English Baptist missionary known as the "father of modern missions." Worked in India for over 40 years translating the Bible into Bengali, Sanskrit, and dozens of other languages.', 'Born August 17, 1761; died June 9, 1834.'),
('Charles Spurgeon', 'C.H. Spurgeon', 1834, 1892, 0, 0, 'certain', 'other', 'minor', NULL, NULL, NULL, 'English Baptist preacher known as the "Prince of Preachers." Pastored the Metropolitan Tabernacle in London (seating 5,000). Sermons still widely read.', 'Born June 19, 1834; died January 31, 1892.'),
('D.L. Moody', 'Dwight Lyman Moody', 1837, 1899, 0, 0, 'certain', 'other', 'minor', NULL, NULL, NULL, 'American evangelist whose revival campaigns reached millions. Founded the Moody Bible Institute (1886) and the Moody Church in Chicago.', 'Born February 5, 1837; died December 22, 1899.'),

-- Modern Era
('Dietrich Bonhoeffer', NULL, 1906, 1945, 0, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'German Lutheran pastor and theologian who opposed Nazism. Co-authored the Barmen Declaration. Executed in Flossenbürg concentration camp weeks before liberation. Author of The Cost of Discipleship.', 'Born February 4, 1906; hanged April 9, 1945.'),
('C.S. Lewis', 'Clive Staples Lewis', 1898, 1963, 0, 0, 'certain', 'other', 'moderate', NULL, NULL, NULL, 'British scholar and author. Converted from atheism to Christianity (1931). His works — Mere Christianity, The Screwtape Letters, The Chronicles of Narnia — remain the most widely read Christian apologetics.', 'Born November 29, 1898; died November 22, 1963.'),
('Billy Graham', 'William Franklin Graham Jr.', 1918, 2018, 0, 0, 'certain', 'other', 'major', NULL, NULL, NULL, 'American evangelist who preached the gospel to an estimated 215 million people in 185 countries. Counselor to twelve U.S. presidents. Founded the Billy Graham Evangelistic Association.', 'Born November 7, 1918; died February 21, 2018.');

-- ============================================================
-- CHURCH HISTORY — PERSON-EVENT RELATIONSHIPS
-- ============================================================
-- People IDs: 323=Ignatius, 324=Polycarp, 325=Irenaeus, 326=Origen, 327=Tertullian,
-- 328=Athanasius, 329=Jerome, 330=Augustine, 331=Benedict, 332=Patrick,
-- 333=Francis, 334=Aquinas, 335=Wycliffe, 336=Hus, 337=Gutenberg,
-- 338=Luther, 339=Tyndale, 340=Calvin, 341=Knox, 342=Wesley,
-- 343=Edwards, 344=Carey, 345=Spurgeon, 346=Moody, 347=Bonhoeffer,
-- 348=Lewis, 349=Graham (actually 350)
INSERT INTO person_events (person_id, event_id, role_in_event) VALUES
-- Ignatius → Martyrdom of Ignatius (95)
(323, 95, 'Martyr'),
-- Polycarp → Martyrdom of Polycarp (96)
(324, 96, 'Martyr'),
-- Irenaeus → Writes Against Heresies (97)
(325, 97, 'Author'),
-- Origen → Opens Catechetical School (98)
(326, 98, 'Teacher'),
-- Athanasius → Lists NT Books (102)
(328, 102, 'Author'),
-- Jerome → Completes the Vulgate (104)
(329, 104, 'Translator'),
-- Augustine → Council of Carthage (103)
(330, 103, 'Bishop present'),
-- Benedict → Writes His Rule (107)
(331, 107, 'Author'),
-- Francis → Founds Franciscans (113)
(333, 113, 'Founder'),
-- Aquinas → Summa (114)
(334, 114, 'Author'),
-- Wycliffe → English Bible (115)
(335, 115, 'Translator'),
-- Hus → Martyred (116)
(336, 116, 'Martyr'),
-- Gutenberg → Prints Bible (117)
(337, 117, 'Printer'),
-- Luther → 95 Theses (118)
(338, 118, 'Author'),
-- Luther → Diet of Worms (119)
(338, 119, 'Defendant'),
-- Tyndale → NT Published (120)
(339, 120, 'Translator'),
-- Calvin → Institutes (121)
(340, 121, 'Author'),
-- Wesley → Aldersgate (126)
(342, 126, 'Subject'),
-- Edwards → Great Awakening (127)
(343, 127, 'Preacher'),
-- Carey → Sails for India (128)
(344, 128, 'Missionary'),
-- Bonhoeffer → Barmen Declaration (135)
(347, 135, 'Co-author'),
-- Graham → Global Crusades (139)
(349, 139, 'Evangelist'),
-- Graham → Lausanne Congress (140)
(349, 140, 'Convener'),
-- Jude brother of Jesus → Jude Written (person 321 created above)
(321, 167, 'author');
INSERT INTO journeys (name, description, book_id) VALUES
('Book of Acts', 'The spread of the early church from Jerusalem to Rome, following the narrative of Acts.', 44);

-- Acts journey stops (journey_id=1, location IDs match the locations table)
-- Locations: 7=Jerusalem, 12=Damascus, 13=Antioch, 14=Rome, 26=Samaria, 27=Gaza Road,
-- 28=Joppa, 29=Caesarea, 30=Cyprus, 31=Pisidian Antioch, 32=Iconium, 33=Lystra,
-- 34=Derbe, 35=Troas, 36=Philippi, 37=Thessalonica, 38=Berea, 39=Athens,
-- 40=Corinth, 41=Ephesus, 42=Miletus, 43=Crete, 44=Malta, 45=Puteoli
INSERT INTO journey_stops (journey_id, sort_order, location_id, event_id, label, description, year, chapter) VALUES
-- Acts 1-2: Birth of the Church
(1, 10, 7, 48, 'Pentecost in Jerusalem', 'The Holy Spirit descends on the apostles; Peter preaches and 3,000 are baptized.', 33, 'Acts 2:1-47'),
-- Acts 6-7: First Martyr
(1, 20, 7, 49, 'Stoning of Stephen', 'Stephen is stoned; persecution scatters believers beyond Jerusalem.', 35, 'Acts 6:8–7:60'),
-- Acts 8: Philip's Ministry
(1, 30, 26, NULL, 'Philip Preaches in Samaria', 'Philip performs miracles in Samaria; Simon the sorcerer believes.', 35, 'Acts 8:4-25'),
(1, 40, 27, NULL, 'Ethiopian Eunuch Baptized', 'Philip meets an Ethiopian official on the Gaza road and baptizes him.', 35, 'Acts 8:26-40'),
-- Acts 9: Saul's Conversion
(1, 50, 12, 50, 'Conversion of Saul', 'Saul encounters Christ on the Damascus road; Ananias restores his sight.', 35, 'Acts 9:1-19'),
-- Acts 9: Peter's Coastal Ministry
(1, 60, 28, NULL, 'Peter Raises Tabitha in Joppa', 'Peter raises the disciple Tabitha (Dorcas) from the dead.', 37, 'Acts 9:36-43'),
-- Acts 10: Gentile Inclusion
(1, 70, 29, NULL, 'Peter and Cornelius in Caesarea', 'Peter receives a vision; the first Gentiles receive the Holy Spirit.', 40, 'Acts 10:1-48'),
-- Acts 11-12: Antioch Church
(1, 80, 13, NULL, 'Church Established in Antioch', 'Believers first called "Christians" in Antioch; Barnabas and Saul teach.', 43, 'Acts 11:19-30'),
-- Acts 13-14: First Missionary Journey
(1, 90, 30, NULL, 'Barnabas and Saul in Cyprus', 'Paul blinds the sorcerer Bar-Jesus; proconsul Sergius Paulus believes.', 47, 'Acts 13:4-12'),
(1, 100, 31, NULL, 'Paul Preaches in Pisidian Antioch', 'Paul''s sermon in the synagogue; many believe but Jews stir up opposition.', 47, 'Acts 13:14-52'),
(1, 110, 32, NULL, 'Iconium — Belief and Opposition', 'Paul and Barnabas preach; the city divides; they flee before stoning.', 48, 'Acts 14:1-7'),
(1, 120, 33, NULL, 'Lystra — Healing and Stoning', 'Paul heals a lame man; mistaken for gods; then stoned and left for dead.', 48, 'Acts 14:8-20'),
(1, 130, 34, NULL, 'Derbe — Many Disciples', 'Paul and Barnabas make many disciples and begin the return journey.', 48, 'Acts 14:20-21'),
-- Acts 15: Council
(1, 140, 7, 52, 'Council of Jerusalem', 'Church leaders decide Gentiles need not be circumcised.', 49, 'Acts 15:1-35'),
-- Acts 16-18: Second Missionary Journey
(1, 150, 35, NULL, 'Macedonian Vision at Troas', 'Paul receives a vision: "Come over to Macedonia and help us."', 50, 'Acts 16:8-10'),
(1, 160, 36, NULL, 'Lydia Converted in Philippi', 'Lydia believes; Paul and Silas imprisoned; jailer converted.', 50, 'Acts 16:11-40'),
(1, 170, 37, NULL, 'Paul in Thessalonica', 'Paul reasons in the synagogue; accused of "turning the world upside down."', 50, 'Acts 17:1-9'),
(1, 180, 38, NULL, 'Noble-Minded Bereans', 'The Bereans examine the Scriptures daily to verify Paul''s message.', 50, 'Acts 17:10-15'),
(1, 190, 39, NULL, 'Paul on the Areopagus in Athens', 'Paul preaches about the "Unknown God" on Mars Hill.', 51, 'Acts 17:16-34'),
(1, 200, 40, NULL, 'Paul in Corinth — 18 Months', 'Paul stays with Aquila and Priscilla; Gallio dismisses charges.', 51, 'Acts 18:1-17'),
-- Acts 19-20: Third Missionary Journey
(1, 210, 41, NULL, 'Paul in Ephesus — 2 Years', 'Extraordinary miracles; burning of occult scrolls; riot of Demetrius.', 54, 'Acts 19:1-41'),
(1, 220, 42, NULL, 'Farewell to Ephesian Elders at Miletus', 'Paul''s emotional farewell: "I have not coveted anyone''s silver or gold."', 57, 'Acts 20:17-38'),
-- Acts 21-26: Arrest and Trials
(1, 230, 7, NULL, 'Paul Arrested in Jerusalem', 'Paul seized in the temple; transferred to Roman custody.', 57, 'Acts 21:27–23:10'),
(1, 240, 29, NULL, 'Paul''s Trial before Felix and Festus', 'Paul held in Caesarea for two years; appeals to Caesar.', 58, 'Acts 23:23–26:32'),
-- Acts 27-28: Journey to Rome
(1, 250, 43, NULL, 'Storm and Fair Havens of Crete', 'Paul warns against sailing; a violent storm batters the ship 14 days.', 60, 'Acts 27:7-44'),
(1, 260, 44, NULL, 'Shipwreck on Malta', 'All 276 aboard survive; Paul bitten by a viper but unharmed; heals the sick.', 60, 'Acts 27:39–28:10'),
(1, 270, 45, NULL, 'Landing at Puteoli', 'Paul welcomed by believers at the Italian port.', 61, 'Acts 28:13-14'),
(1, 280, 14, NULL, 'Paul Arrives in Rome', 'Paul preaches the kingdom of God under house arrest for two years.', 61, 'Acts 28:16-31');

-- ── Genesis Journey ──────────────────────────────────────────
INSERT INTO journeys (name, description, book_id) VALUES
('Book of Genesis', 'From Creation through the patriarchs — Abraham, Isaac, Jacob, and Joseph — ending with Israel in Egypt.', 1);

INSERT INTO journey_stops (journey_id, sort_order, location_id, event_id, label, description, year, chapter) VALUES
-- Creation & Early Humanity
(2, 10, 2, 1, 'Creation', 'God creates the heavens, the earth, and mankind in His image.', -4004, 'Genesis 1:1–2:25'),
(2, 20, 2, 2, 'The Fall', 'Adam and Eve disobey God and are expelled from the Garden of Eden.', -4004, 'Genesis 3:1-24'),
(2, 30, 2, 3, 'The Flood', 'God judges the earth with a flood; Noah and his family are saved on the ark.', -2349, 'Genesis 6:1–9:29'),
(2, 40, 2, 4, 'Tower of Babel', 'Humanity is scattered when God confuses their language at the tower.', -2247, 'Genesis 11:1-9'),
-- Abraham Cycle
(2, 50, 2, 5, 'Call of Abraham in Ur', 'God calls Abram to leave Ur and go to a land He will show him.', -1921, 'Genesis 12:1-3'),
(2, 60, 3, NULL, 'Abraham in Haran', 'Abram settles in Haran with Terah; after Terah''s death, he departs for Canaan.', -1921, 'Genesis 11:31–12:4'),
(2, 70, 46, NULL, 'Abraham at Shechem', 'Abram arrives in Canaan; God promises the land. Abraham builds an altar.', -1920, 'Genesis 12:6-7'),
(2, 80, 47, 6, 'Abrahamic Covenant at Hebron', 'God makes a covenant with Abraham at the oaks of Mamre, promising countless descendants.', -1913, 'Genesis 13:18; 15:1-21'),
(2, 90, 5, NULL, 'Abram in Egypt', 'Famine drives Abram to Egypt; Pharaoh takes Sarai but is plagued.', -1919, 'Genesis 12:10-20'),
(2, 100, 48, NULL, 'Hagar and Ishmael at Beersheba', 'Hagar and Ishmael sent away; God provides a well in the wilderness.', -1907, 'Genesis 21:8-21'),
(2, 110, 8, 9, 'Covenant of Circumcision', 'God establishes circumcision as the sign of His covenant with Abraham.', -1897, 'Genesis 17:1-27'),
(2, 120, 47, 8, 'Destruction of Sodom and Gomorrah', 'Abraham intercedes; God destroys the cities but Lot escapes.', -1897, 'Genesis 18:1–19:38'),
(2, 130, 7, 7, 'Binding of Isaac on Mount Moriah', 'Abraham''s faith tested; God provides a ram as a substitute.', -1872, 'Genesis 22:1-19'),
-- Jacob Cycle
(2, 140, 48, NULL, 'Isaac and Rebekah at Beersheba', 'Isaac settles at Beersheba; Jacob and Esau are born.', -1837, 'Genesis 25:19-26; 26:23-33'),
(2, 150, 3, NULL, 'Jacob Flees to Haran', 'Jacob flees Esau''s anger; dreams of a ladder to heaven at Bethel; serves Laban 20 years.', -1760, 'Genesis 27:1–31:55'),
(2, 160, 50, 10, 'Jacob Wrestles God at Peniel', 'Jacob wrestles with God and is renamed Israel.', -1739, 'Genesis 32:22-32'),
(2, 170, 46, NULL, 'Jacob Returns to Shechem', 'Jacob returns to Canaan and buys land at Shechem; Dinah incident.', -1738, 'Genesis 33:18–34:31'),
(2, 180, 47, NULL, 'Jacob Settles in Hebron', 'Jacob returns to Mamre/Hebron; Rachel dies near Bethlehem; Isaac dies.', -1716, 'Genesis 35:27-29'),
-- Joseph Cycle
(2, 190, 47, 11, 'Joseph Sold into Slavery', 'Joseph''s brothers sell him to traders headed for Egypt.', -1728, 'Genesis 37:1-36'),
(2, 200, 5, 12, 'Joseph Made Ruler of Egypt', 'After interpreting Pharaoh''s dreams, Joseph becomes second-in-command.', -1715, 'Genesis 41:1-57'),
(2, 210, 49, 13, 'Israel Enters Goshen', 'Jacob''s family (70 people) settles in Goshen at Pharaoh''s invitation.', -1706, 'Genesis 46:1–47:31');

-- ── Exodus Journey ───────────────────────────────────────────
INSERT INTO journeys (name, description, book_id) VALUES
('Book of Exodus', 'The deliverance of Israel from Egypt through the wilderness to Mount Sinai and the building of the Tabernacle.', 2);

INSERT INTO journey_stops (journey_id, sort_order, location_id, event_id, label, description, year, chapter) VALUES
(3, 10, 49, NULL, 'Israel Enslaved in Goshen', 'A new Pharaoh arises who does not know Joseph; Israel is enslaved and multiplies.', -1571, 'Exodus 1:1-22'),
(3, 20, 5, 14, 'The Ten Plagues', 'Moses confronts Pharaoh; God sends ten plagues upon Egypt, ending with the death of every firstborn.', -1491, 'Exodus 7:1–12:36'),
(3, 30, 49, NULL, 'The Passover and Departure', 'Israel celebrates the first Passover and departs Egypt with great wealth.', -1491, 'Exodus 12:1-42'),
(3, 40, 51, 15, 'Crossing the Red Sea', 'God parts the sea; Israel passes through on dry ground; Pharaoh''s army is destroyed.', -1491, 'Exodus 14:1-31'),
(3, 50, 52, NULL, 'Bitter Waters of Marah', 'Israel''s first crisis: bitter water is made sweet by a tree God shows Moses.', -1491, 'Exodus 15:22-25'),
(3, 60, 53, NULL, 'Rest at Elim', 'Israel camps at an oasis with twelve springs and seventy palm trees.', -1491, 'Exodus 15:27'),
(3, 70, 54, NULL, 'Water from the Rock at Rephidim', 'God provides water from a rock; Israel defeats Amalek while Moses'' hands are raised.', -1491, 'Exodus 17:1-16'),
(3, 80, 6, 16, 'Giving of the Law at Sinai', 'God descends on Mount Sinai in fire and thunder; gives the Ten Commandments and the Law.', -1491, 'Exodus 19:1–24:18'),
(3, 90, 6, NULL, 'The Golden Calf', 'While Moses is on the mountain, Aaron makes a golden calf; God''s anger and Moses'' intercession.', -1491, 'Exodus 32:1-35'),
(3, 100, 6, 18, 'The Tabernacle Completed', 'Israel builds the Tabernacle according to God''s pattern; the glory of the Lord fills it.', -1490, 'Exodus 35:1–40:38'),
(3, 110, 55, 17, 'Wilderness Wandering — Kadesh Barnea', 'The twelve spies return; ten give a bad report. Israel is condemned to wander 40 years.', -1490, 'Numbers 13:1–14:45'),
(3, 120, 25, NULL, 'Arrival at the Jordan', 'After 40 years, the new generation reaches the Jordan River opposite the Promised Land.', -1451, 'Deuteronomy 34:1-12; Joshua 1:1-18');

-- ── Gospel of Luke Journey ───────────────────────────────────
INSERT INTO journeys (name, description, book_id) VALUES
('Gospel of Luke', 'The life of Jesus from birth through resurrection, following Luke''s orderly account.', 42);

INSERT INTO journey_stops (journey_id, sort_order, location_id, event_id, label, description, year, chapter) VALUES
(4, 10, 7, NULL, 'Zechariah in the Temple', 'The angel Gabriel announces the birth of John the Baptist to the priest Zechariah.', -6, 'Luke 1:5-25'),
(4, 20, 10, NULL, 'Annunciation in Nazareth', 'Gabriel tells the virgin Mary she will bear the Son of God.', -5, 'Luke 1:26-38'),
(4, 30, 8, 42, 'Birth of Jesus in Bethlehem', 'Jesus is born in a manger; angels announce the birth to shepherds.', -5, 'Luke 2:1-20'),
(4, 40, 7, NULL, 'Presentation at the Temple', 'Mary and Joseph present Jesus at the Temple; Simeon and Anna prophesy.', -5, 'Luke 2:22-40'),
(4, 50, 10, NULL, 'The Boy Jesus in Nazareth', 'Jesus grows up in Nazareth; at age 12 astounds the teachers in the Temple.', 8, 'Luke 2:39-52'),
(4, 60, 25, 43, 'Baptism of Jesus at the Jordan', 'Jesus is baptized by John; the Holy Spirit descends; the Father speaks.', 26, 'Luke 3:21-22'),
(4, 70, 10, NULL, 'Rejected at Nazareth', 'Jesus reads Isaiah in the synagogue; his hometown tries to throw him off a cliff.', 27, 'Luke 4:16-30'),
(4, 80, 11, 61, 'Ministry Begins in Capernaum', 'Jesus drives out a demon in the synagogue and heals Peter''s mother-in-law.', 27, 'Luke 4:31-41'),
(4, 90, 17, 60, 'Great Catch of Fish', 'Jesus calls Simon Peter, James, and John after a miraculous catch of fish.', 27, 'Luke 5:1-11'),
(4, 100, 19, 68, 'Raising the Widow''s Son at Nain', 'Jesus raises a widow''s only son from the dead; "God has visited His people."', 28, 'Luke 7:11-17'),
(4, 110, 17, 69, 'Calming the Storm', 'Jesus rebukes the wind and waves; the disciples ask, "Who is this?"', 28, 'Luke 8:22-25'),
(4, 120, 21, 70, 'Healing of the Gerasene Demoniac', 'Jesus casts Legion out of a man among the tombs on the eastern shore.', 28, 'Luke 8:26-39'),
(4, 130, 18, 75, 'Feeding of the 5,000 near Bethsaida', 'Jesus feeds 5,000 men with five loaves and two fish.', 29, 'Luke 9:10-17'),
(4, 140, 26, NULL, 'The Good Samaritan — Road to Jericho', 'Jesus tells the parable of the Good Samaritan to a lawyer''s question.', 30, 'Luke 10:25-37'),
(4, 150, 20, NULL, 'Mary and Martha in Bethany', 'Martha serves while Mary sits at Jesus'' feet; "Mary has chosen the good portion."', 30, 'Luke 10:38-42'),
(4, 160, 22, 89, 'Healing of Blind Bartimaeus', 'Jesus heals a blind man near Jericho; Zacchaeus believes.', 33, 'Luke 18:35–19:10'),
(4, 170, 7, 45, 'Crucifixion in Jerusalem', 'Jesus is crucified at Golgotha; "Father, forgive them, for they know not what they do."', 33, 'Luke 23:1-56'),
(4, 180, 7, 46, 'The Empty Tomb', 'Women find the tomb empty; angels declare, "He is not here; He has risen!"', 33, 'Luke 24:1-12'),
(4, 190, 57, NULL, 'Road to Emmaus', 'The risen Jesus walks with two disciples; revealed in the breaking of bread.', 33, 'Luke 24:13-35'),
(4, 200, 7, 47, 'Ascension near Jerusalem', 'Jesus blesses the disciples and is taken up into heaven near Bethany.', 33, 'Luke 24:50-53');

-- ── Book of Jonah Journey ────────────────────────────────────
INSERT INTO journeys (name, description, book_id) VALUES
('Book of Jonah', 'The prophet Jonah flees from God, is swallowed by a great fish, and ultimately preaches repentance to Nineveh.', 32);

INSERT INTO journey_stops (journey_id, sort_order, location_id, event_id, label, description, year, chapter) VALUES
(5, 10, 7, NULL, 'God''s Call to Jonah', 'The word of the Lord comes to Jonah: "Go to Nineveh, that great city, and cry out against it."', -785, 'Jonah 1:1-2'),
(5, 20, 28, NULL, 'Jonah Flees to Joppa', 'Instead of obeying, Jonah goes down to Joppa and boards a ship bound for Tarshish — away from God.', -785, 'Jonah 1:3'),
(5, 30, 17, NULL, 'The Great Storm at Sea', 'God hurls a great wind; the sailors cast lots; Jonah confesses and is thrown overboard.', -785, 'Jonah 1:4-16'),
(5, 40, 17, NULL, 'Swallowed by the Great Fish', 'God appoints a great fish to swallow Jonah. He prays from its belly for three days and nights.', -785, 'Jonah 1:17–2:10'),
(5, 50, 56, NULL, 'Jonah Preaches in Nineveh', 'Jonah walks through the great city crying, "Yet forty days, and Nineveh shall be overthrown!"', -785, 'Jonah 3:1-4'),
(5, 60, 56, NULL, 'Nineveh Repents', 'The king and all the people repent in sackcloth and ashes; God relents from disaster.', -785, 'Jonah 3:5-10'),
(5, 70, 56, NULL, 'Jonah''s Anger and the Vine', 'Jonah is angry that God showed mercy. God teaches him compassion through a vine and a worm.', -785, 'Jonah 4:1-11');
