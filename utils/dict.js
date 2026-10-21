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
  'triangle rectangle line dot snowman princess superhero'
]

var seen = {}
var list = []

GROUPS.join(' ').toLowerCase().split(/\s+/).forEach(function (w) {
  if (!w || seen[w]) return
  seen[w] = true
  list.push(w)
})
list.sort()

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
