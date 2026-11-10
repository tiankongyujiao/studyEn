// 内置词表：小学阶段常用词优先，其余由常用大词表按词频补足。纯本地，不联网。
// 扩充词表直接在对应分组里加词（空格分隔）即可，加载时自动去重、排序。
var GROUPS = [
  // 代词 / 疑问词
  'a an the i you he she it we they me him her us them my your his its our their ' +
  'this that these those who whose what which where when why how',

  // 副词 / 连接词 / 介词
  'some any no not every each all both many much more most few little less one other ' +
  'another such so too very just only also again ever never always often sometimes ' +
  'usually soon already still here there now then yes maybe please thanks ok ' +
  'and or but because if than with without about after before from to in on at by for ' +
  'of up down out over under between into around through off back',

  // 问候语
  'hello hi goodbye bye welcome sorry',

  // 数字 / 序数词
  'zero one two three four five six seven eight nine ten eleven twelve thirteen ' +
  'fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty ' +
  'sixty seventy eighty ninety hundred thousand ' +
  'first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth twentieth',

  // 颜色
  'red orange yellow green blue purple pink brown black white gray grey gold silver',

  // 动物
  'animal cat dog puppy kitten bird duck chicken hen chick pig cow horse sheep goat ' +
  'rabbit mouse mice monkey tiger lion elephant giraffe panda bear wolf fox deer ' +
  'snake frog turtle whale dolphin shark crab ant bee butterfly spider dragon dinosaur ' +
  'kangaroo penguin owl eagle parrot camel hippo zebra squirrel hamster fish pet insect',

  // 身体
  'body head hair face eye ear nose mouth tooth teeth tongue neck shoulder arm hand ' +
  'finger thumb leg knee foot feet toe heel back heart skin stomach elbow wrist lip chin cheek',

  // 家庭 / 人物
  'family father mother dad mom mum daddy mommy brother sister grandpa grandma ' +
  'grandfather grandmother uncle aunt cousin son daughter parent parents baby kid ' +
  'child children boy girl man woman people person friend',

  // 食物 / 饮品
  'food apple banana pear peach grape orange watermelon strawberry cherry lemon mango ' +
  'pineapple fruit vegetable tomato potato carrot onion cabbage bean corn pea mushroom ' +
  'egg bread cake cookie biscuit candy chocolate milk water juice tea coffee soup rice ' +
  'noodle noodles meat beef pork chicken fish hamburger sandwich pizza salad sugar salt ' +
  'butter cheese yogurt breakfast lunch dinner meal snack delicious sweet sour spicy',

  // 学校 / 学习
  'school classroom class lesson book notebook textbook pencil pen eraser rubber ruler ' +
  'sharpener bag schoolbag desk chair blackboard chalk library playground homework ' +
  'test exam question answer study learn read write listen speak draw sing dance play ' +
  'count spell word sentence letter english chinese math maths music art science history ' +
  'geography computer map picture paper glue scissors crayon uniform',

  // 家居 / 衣物
  'home house room bedroom kitchen bathroom door window wall floor bed table sofa clock ' +
  'light lamp television tv phone telephone fridge mirror box key cup bottle bowl plate ' +
  'spoon fork knife towel soap brush blanket pillow clothes shirt skirt dress coat jacket ' +
  'sweater pants trousers shorts shoes socks sandals hat cap scarf gloves glasses watch ' +
  'ring wallet umbrella backpack',

  // 地点 / 自然 / 天气
  'park zoo shop store supermarket hospital bank restaurant cinema museum farm city town ' +
  'village street road bridge river lake sea ocean mountain hill forest garden beach ' +
  'island sky sun moon star cloud rain rainbow snow storm thunder lightning wind ice ' +
  'weather spring summer autumn fall winter day night morning afternoon evening week ' +
  'month year hour minute second birthday holiday weekend ' +
  'tree flower grass leaf leaves seed root branch stone rock sand mud wave earth world ' +
  'nature air fire water',

  // 交通
  'car bus bike bicycle train plane airplane ship boat taxi subway truck jeep motorbike rocket',

  // 星期 / 月份 / 节日
  'monday tuesday wednesday thursday friday saturday sunday ' +
  'january february march april may june july august september october november december ' +
  'festival christmas halloween',

  // 动词
  'be am is are was were have has had do does did go come run walk jump swim fly ride ' +
  'drive sit stand sleep wake eat drink cook wash clean work help make take give put ' +
  'open close start stop begin end finish look see watch hear smell taste touch feel ' +
  'like love hate want need know think say tell talk ask call meet visit buy sell pay ' +
  'find lose keep hold bring carry paint color colour cut fold build break fix grow ' +
  'plant pick throw catch kick hit push pull turn move stay wait live leave arrive ' +
  'return lie cry laugh smile show wear try use win dry hang hurry enjoy hope wish ' +
  'thank remember forget understand choose change share borrow lend follow lead',

  // 形容词
  'big small long short tall high low fat thin new old young happy sad angry tired busy ' +
  'free easy hard difficult good bad nice kind friendly funny beautiful pretty cute ugly ' +
  'strong weak fast slow quick quiet loud noisy dirty warm cool hot cold wet full empty ' +
  'closed rich poor safe dangerous important different same right wrong true false real ' +
  'ready late early round square soft salty healthy sick ill afraid brave clever smart ' +
  'lazy careful favorite favourite interesting boring exciting wonderful great fine glad ' +
  'proud lucky sure dear',

  // 玩具 / 游戏 / 生活杂项
  'toy ball doll kite balloon robot puzzle game gift present party candle card money ' +
  'ticket photo story song movie film cartoon magic dream idea name number shape circle ' +
  'triangle rectangle line dot snowman princess superhero',

  // 动物与叫声（绘本高频）
  'ant bee butterfly ladybug dragonfly grasshopper cricket moth firefly snail worm spider ' +
  'kangaroo koala hippo rhino zebra camel llama moose raccoon hedgehog otter seal walrus ' +
  'penguin panda cub calf foal lamb piglet pony donkey ox bull buffalo goat fawn ' +
  'eagle hawk owl parrot peacock pigeon goose swan dove crow raven sparrow robin turkey ' +
  'chick duckling nest feather beak wing claw paw tail horn whisker fur ' +
  'lizard turtle tortoise crocodile alligator snake python frog tadpole salamander ' +
  'whale dolphin shark jellyfish octopus squid crab lobster shrimp clam oyster shell coral reef seaweed ' +
  'caterpillar cocoon chrysalis bumblebee ' +
  'moo oink quack baa neigh meow woof bark roar purr tweet chirp hiss buzz cluck honk growl',

  // 自然 / 户外 / 天气 / 太空
  'forest woods meadow field valley cave cliff canyon desert jungle swamp pond puddle ' +
  'stream brook waterfall shore coast sand seashell pebble boulder mud soil dirt moss fern ' +
  'vine bush shrub hedge twig bark stump log trunk branch petal bud blossom bloom pollen ' +
  'nectar acorn pinecone sprout sapling weed toadstool bamboo cactus palm maple oak willow ' +
  'scarecrow campfire drizzle mist fog breeze gale chilly freezing humid hurricane tornado ' +
  'hail sleet frost dew sunny cloudy rainy snowy windy stormy ' +
  'planet spaceship astronaut spacesuit satellite comet meteor galaxy universe orbit gravity ' +
  'telescope alien spacecraft dawn dusk twilight shadow snowflake snowball',

  // 家居 / 用品
  'bathtub shower toilet sink faucet shampoo toothpaste toothbrush comb mirror towel washcloth ' +
  'tissue napkin kettle teapot pot pan oven stove microwave blender mixer toaster freezer ' +
  'dishwasher cabinet cupboard drawer jar lid straw mug jug pitcher tray apron ' +
  'mattress sheet quilt pillowcase alarm wardrobe closet hanger dresser nightlight curtain ' +
  'carpet rug mat cushion fireplace armchair bench stool bookshelf vase calendar frame poster ' +
  'hammer nail screw screwdriver wrench drill ladder rope string tape needle thread zipper ' +
  'bucket broom mop dustpan sponge trash garbage bin vacuum flashlight battery chain ' +
  'helmet mitten mittens slipper slippers sneaker sneakers boots sandal sandals raincoat pajamas pyjamas ' +
  'sweatshirt hoodie vest belt ribbon badge pocket sleeve collar strap buckle sunglasses ' +
  'earring necklace bracelet eyelash eyebrow forehead palm fist knuckle lap waist hip chest ' +
  'throat brain bone muscle blood pulse breath sneeze cough fever headache toothache stomachache ' +
  'bandage plaster medicine pill chickenpox',

  // 食物
  'broccoli cauliflower pumpkin zucchini cucumber pepper celery lettuce spinach garlic ginger radish ' +
  'beet eggplant asparagus apricot plum kiwi coconut fig blueberry raspberry blackberry cranberry ' +
  'papaya avocado tangerine lime melon grapefruit pomegranate ' +
  'flour wheat oat oats cereal porridge oatmeal pancake waffle toast muffin pie tart donut doughnut ' +
  'pretzel popcorn chips cracker lollipop marshmallow jelly jam honey syrup peanut cupcake pudding ' +
  'dessert ketchup mustard mayonnaise sauce vinegar oil spice cinnamon vanilla recipe ingredient ' +
  'lemonade soda cola milkshake smoothie picnic barbecue',

  // 学校 / 学习用品
  'workbook dictionary magazine newspaper comic globe atlas alphabet vowel consonant syllable rhyme ' +
  'poem poetry riddle quiz spelling handwriting uppercase lowercase paragraph chapter page cover ' +
  'title author illustrator librarian principal canteen locker lunchbox stapler paperclip binder ' +
  'folder envelope stamp postcard sticker marker paintbrush easel clay dough whiteboard projector ' +
  'keyboard printer tablet headphones microphone speaker charger cable drone calculator abacus ' +
  'compass protractor',

  // 动作（绘本高频）
  'hop skip leap crawl climb slide swing spin twirl tumble roll bounce toss dribble squeeze pinch ' +
  'tickle hug cuddle kiss wave nod clap stomp hum whistle whisper shout yell scream mumble giggle ' +
  'chuckle grin frown pout blink wink yawn snore breathe swallow chew lick bite sip slurp munch ' +
  'gobble pour stir mix bake fry boil roast grill peel slice chop spread sprinkle scoop rinse wipe ' +
  'sweep dust polish scrub sew knit untie lift drag tuck wrap unwrap stack arrange tidy pack unpack ' +
  'decorate dig rake feed chase fetch hide seek hunt camp hike paddle row sail surf skate ski sled ' +
  'race measure trace erase copy paste tear rip staple mark circle underline pretend imagine ' +
  'explore discover adventure wander gather collect invite celebrate cheer nap rest relax sob weep ' +
  'sigh groan moan worry scare frighten surprise amaze impress encourage comfort promise apologize ' +
  'forgive greet introduce practice improve decide solve guess wonder plan prepare organize',

  // 情感 / 性格
  'glad cheerful joyful delighted excited thrilled amazed surprised confused puzzled curious shy ' +
  'nervous anxious scared frightened terrified upset grumpy cranky cross annoyed frustrated ' +
  'disappointed lonely jealous gentle generous honest polite rude helpful thoughtful caring bold ' +
  'fearless calm patient stubborn silly naughty mischievous clumsy greedy selfish thankful grateful ' +
  'hopeful embarrassed ashamed guilty confident worried peaceful relaxed comfortable cozy',

  // 节日 / 演出
  'santa reindeer sleigh stocking chimney wreath mistletoe ornament gingerbread ghost witch wizard ' +
  'potion mask costume trick treat bunny lantern firecracker thanksgiving harvest parade fireworks ' +
  'celebration carnival circus clown juggler magician puppet stage audience performance actress ' +
  'invitation',

  // 城市 / 交通 / 职业
  'tram ferry canoe kayak sailboat yacht helicopter jet glider scooter skateboard wagon cart ' +
  'carriage tractor bulldozer crane ambulance escalator elevator station airport harbor port ' +
  'platform tunnel crosswalk sidewalk traffic signal garage corner avenue plaza fountain statue ' +
  'monument tower castle palace temple church stadium gym pool carousel campsite cabin ' +
  'cottage hut barn stable lighthouse windmill fence gate yard lawn driveway mailbox roof balcony ' +
  'stairs staircase attic basement cellar hallway corridor tent neighbor neighborhood community citizen ' +
  'visitor tourist guide guard police postman mailman cashier clerk waiter waitress chef baker ' +
  'butcher carpenter plumber electrician mechanic engineer architect lawyer judge soldier sailor ' +
  'captain pilot professor coach referee goalkeeper player champion team match score trophy medal ' +
  'marathon',

  // 童话 / 故事阅读
  'magical fairy giant dwarf elf unicorn mermaid pirate treasure chest mystery secret clue wand ' +
  'curse hero heroine villain prince king queen knight sword shield armor monster beast troll ' +
  'goblin vampire zombie skeleton gown crown jewel diamond ruby emerald pearl golden shiny ' +
  'sparkle glitter glow shine darkness gloomy scary creepy spooky haunted ordinary special ' +
  'extraordinary invisible huge enormous tiny weird strange wise foolish loyal noble humble royal ' +
  'ancient modern everywhere somewhere nowhere anywhere forever suddenly quietly loudly gently ' +
  'softly carefully quickly slowly happily sadly angrily bravely finally echo silence noise sound ' +
  'voice',

  // 玩具 / 运动
  'marble marbles spinner jigsaw dice domino seesaw sandbox trampoline racket paddle goal hoop ' +
  'hopscotch soccer football basketball baseball volleyball tennis badminton golf hockey gymnastics ' +
  'karate relay sprint jog',

  // 日常 / 家庭关系
  'tonight bedtime daytime routine schedule timetable chore laundry babysitter sibling twin twins ' +
  'toddler teenager grownup grandparent husband wife married wedding bride groom anniversary born ' +
  'birth everybody everyone everything nobody nothing someone something anyone anything myself ' +
  'yourself himself herself ourselves themselves itself either neither whether unless until while ' +
  'during across along beside nearby below beyond toward towards against among throughout above ' +
  'ahead apart aside onto within',

  // 常见复数 / 不规则变形（绘本里绕不开）
  'children teeth geese mice feet oxen wolves calves shelves knives leaves lives halves loaves ' +
  'wives scarves potatoes tomatoes heroes apples bananas oranges pears peaches grapes strawberries ' +
  'cherries lemons mangos pineapples watermelons carrots onions cabbages beans peas mushrooms eggs ' +
  'cakes cookies candies chocolates books pencils pens rulers bags cats dogs birds ducks pigs cows ' +
  'horses goats rabbits monkeys tigers lions elephants pandas bears foxes snakes frogs turtles ' +
  'whales dolphins spiders ants bees butterflies flowers trees boys girls friends teachers ' +
  'students pupils toys balls dolls kites balloons robots games songs movies films stories pictures ' +
  'classes buses boxes watches dishes sandwiches hamburgers pizzas noodles ' +
  'cried tried dried hurried carried studied married buried ' +
  'went saw ate swam flew ran came got made took gave said told found bought brought thought ' +
  'taught caught threw grew knew drew drank sang rang began broke chose did had was were won lost ' +
  'felt smelt heard held kept left met paid sent spent slept swept woke wrote rode drove stood sat ' +
  'hung dug fed fought hid bit blew froze stole shook wore tore swore lay lain ' +
  'eaten written spoken broken chosen driven ridden stolen forgotten hidden bitten beaten ' +
  'fallen risen gotten'
]

var seen = {}
var list = []

GROUPS.join(' ').toLowerCase().split(/\s+/).forEach(function (w) {
  if (!w || seen[w]) return
  seen[w] = true
  list.push(w)
})
// 小学/主题词表优先：短词在前，同长度按字母序（孩子要的多半是简单词）
list.sort(function (a, b) {
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)
})

// 常用大词表补足：按词频降序，小学词表里没有的词排在后面
require('./dictData').split(/\s+/).forEach(function (w) {
  if (!w || seen[w]) return
  seen[w] = true
  list.push(w)
})

// 返回以 prefix 开头的最多 limit 个词（按字母序）；无匹配返回空数组
function suggest(prefix, limit) {
  var p = String(prefix || '').trim().toLowerCase()
  if (!p) return []
  var max = limit || 6
  var out = []
  for (var i = 0; i < list.length; i++) {
    if (list[i].indexOf(p) !== 0) continue
    out.push(list[i])
    if (out.length >= max) break
  }
  return out
}

module.exports = {
  suggest: suggest
}
