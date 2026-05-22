// 3DBuildingForge - Building Component Data
// Adapted from 3DCellForge cellData.js
// Cell types → Building types, Organelles → Building component systems

export const CELL_TYPES = [
  { id: 'residential', name: '住宅建筑', type: '建筑标本', accent: '#82b366' },
  { id: 'commercial', name: '商业建筑', type: '建筑标本', accent: '#7e6edb' },
  { id: 'office', name: '办公建筑', type: '建筑标本', accent: '#8b5cf6' },
  { id: 'cultural', name: '文化建筑', type: '建筑标本', accent: '#e07a7a' },
  { id: 'industrial', name: '工业建筑', type: '建筑标本', accent: '#5fbf9f' },
  { id: 'educational', name: '教育建筑', type: '建筑标本', accent: '#459ccf' },
  { id: 'medical', name: '医疗建筑', type: '建筑标本', accent: '#d25762' },
]

export const SEEDED_GENERATED_CELLS = []

export const KHRONOS_REFERENCE_CELLS = []

export const ORGANELLES = {
  nucleus: {
    label: '基础',
    title: '基础',
    subtitle: '建筑根基与地下结构',
    size: '支撑整栋建筑的核心体积',
    location: '建筑底部，埋入地基',
    visible: '在剖面检视模式下可见',
    note: '基础是建筑的根基，将上部荷载传递至地基土层。基础的选型取决于地质条件、建筑高度和荷载大小。',
    accent: '#7b4bb4',
  },
  lysosome: {
    label: '结构体系',
    title: '结构体系',
    subtitle: '承重骨架与力学传递路径',
    size: '贯穿建筑全高',
    location: '分布在整个建筑体量中',
    visible: '作为结构构件可见',
    note: '结构体系是建筑的骨架，包括梁、柱、剪力墙、楼板等。它决定了建筑的空间布局可能性和抗震性能。',
    accent: '#8d58b8',
  },
  mitochondria: {
    label: '围护结构',
    title: '围护结构',
    subtitle: '外墙、屋面与门窗系统',
    size: '覆盖建筑外表面',
    location: '建筑外围边界',
    visible: '始终可见，构成建筑外观',
    note: '围护结构是建筑与外界环境的界面，负责保温隔热、防水防潮、采光通风，同时塑造建筑的外观形象。',
    accent: '#df7046',
  },
  membrane: {
    label: '室内空间',
    title: '室内空间',
    subtitle: '功能分区与空间组织',
    size: '填充建筑内部体积',
    location: '建筑内部各楼层',
    visible: '在剖面模式下可见空间划分',
    note: '室内空间是建筑的核心价值所在——人们使用建筑就是在使用空间。空间的组织方式决定了建筑的功能效率和使用体验。',
    accent: '#7aa4bf',
  },
  granules: {
    label: '设备系统',
    title: '设备系统',
    subtitle: '机电管线与智能控制',
    size: '穿插于结构构件之间',
    location: '设备间、管井、吊顶内',
    visible: '需要开启设备层查看模式',
    note: '设备系统包括暖通空调、给排水、电气照明、消防和智能化系统，是建筑运行的"生命维持系统"。',
    accent: '#5b82c4',
  },
}

export const ORGANELLE_ORDER = ['nucleus', 'lysosome', 'mitochondria', 'membrane', 'granules']

export const MICROSCOPE_IMAGES = [
  { label: '外观透视', tone: 'light', note: '建筑外观清晰展示视图，适合截图。' },
  { label: '材质分析', tone: 'purple', note: '材料与色彩分离预览，分析围护结构材质。' },
  { label: '结构透视', tone: 'mono', note: '结构体系与空间关系可读性预览。' },
]

export const WORKSPACE_PANELS = {
  Gallery: '保存的渲染角度、缩略图和导出的展示截图。',
  Library: '建筑模板、生成的资产、本地导入和参考GLB文件。',
  Notebooks: '与选中建筑和构件关联的观察笔记。',
  Logs: '诊断信息、API请求日志和生成故障排除。',
  Settings: '查看器质量、供应商默认值、截图大小和导出偏好。',
  Compare: '并排建筑对比——形态、材料和结构体系差异。',
  Profile: '当前工作区：建筑构件工坊。',
}

export const CELL_PROFILES = {
  residential: {
    summary: '以居住功能为核心，强调采光通风和私密性。常见砖混或框架结构，墙体厚实，窗地比适中。',
    occurs: '住宅小区、别墅、公寓、宿舍等居住场所。',
    comparison: '相比商业建筑，住宅更注重私密性和舒适度，而非开放性和展示性。',
    compareTarget: 'commercial',
    organelles: ['membrane', 'nucleus', 'mitochondria', 'granules'],
  },
  commercial: {
    summary: '大跨度开敞空间，通透玻璃幕墙，多层人流组织。结构体系需满足大柱网和无柱空间需求。',
    occurs: '购物中心、商业综合体、零售街区。',
    comparison: '比住宅更开放、更具展示性；比办公建筑更强调公共性与体验感。',
    compareTarget: 'office',
    organelles: ['lysosome', 'nucleus', 'mitochondria', 'membrane', 'granules'],
  },
  office: {
    summary: '标准化模数空间，核心筒+大开间布局，强调办公效率和灵活性。常用框架-核心筒结构。',
    occurs: '写字楼、企业总部、产业园区办公楼。',
    comparison: '比商业建筑更注重效率和标准化；比住宅更需要灵活的空间分隔能力。',
    compareTarget: 'residential',
    organelles: ['membrane', 'nucleus', 'mitochondria', 'lysosome', 'granules'],
  },
  cultural: {
    summary: '标志性造型，大跨度无柱空间，声光热特殊要求。结构体系往往是建筑表达的组成部分。',
    occurs: '博物馆、图书馆、剧院、美术馆、文化中心。',
    comparison: '造型自由度远高于其他建筑类型，结构体系本身就是建筑语言。',
    compareTarget: 'educational',
    organelles: ['membrane', 'nucleus', 'mitochondria', 'granules'],
  },
  industrial: {
    summary: '大跨度厂房空间，钢结构为主，注重工艺流线和物流组织。围护结构简洁实用。',
    occurs: '制造车间、仓储物流、产业园区厂房。',
    comparison: '功能优先于形式，结构直接外露，不像文化建筑那样追求造型表达。',
    compareTarget: 'commercial',
    organelles: ['membrane', 'granules'],
  },
  educational: {
    summary: '标准化教室模块+公共活动空间，注重采光和通风。常用框架结构，走廊串联功能房间。',
    occurs: '中小学、大学教学楼、实训中心、图书馆。',
    comparison: '比医疗建筑空间组织更灵活；比办公建筑更强调公共互动和安全性。',
    compareTarget: 'medical',
    organelles: ['membrane', 'nucleus', 'mitochondria', 'granules'],
  },
  medical: {
    summary: '复杂流线组织（洁污分流、医患分流），严格的功能分区和设备系统要求。结构需满足大荷载和防辐射需求。',
    occurs: '综合医院、专科医院、社区卫生中心、康复中心。',
    comparison: '设备系统复杂度远超其他建筑类型，是"最像机器的建筑"。',
    compareTarget: 'educational',
    organelles: ['membrane', 'nucleus', 'mitochondria', 'lysosome', 'granules'],
  },
}

export const DEFAULT_ORGANELLE_BY_CELL = {
  residential: 'membrane',
  commercial: 'lysosome',
  office: 'nucleus',
  cultural: 'membrane',
  industrial: 'granules',
  educational: 'nucleus',
  medical: 'mitochondria',
}

export const CELL_DETAIL_OVERRIDES = {
  residential: {
    nucleus: {
      subtitle: '建筑的根基',
      size: '条形基础宽0.6-1.2m，筏板厚0.4-1.0m',
      location: '埋置深度0.5-3m',
      visible: '剖面模式下可见',
      note: '住宅基础常用条形基础或筏板基础。地基承载力决定了基础形式，软土地基可能需要桩基础。',
      funFact: '中国古代建筑的"台基"就是基础的前身，等级越高台基越高。',
    },
    membrane: {
      title: '住宅外墙',
      subtitle: '保温隔热的围护屏障',
      size: '墙厚240-370mm（含保温层可达500mm）',
      location: '建筑外围',
      visible: '始终可见',
      note: '住宅外墙需满足保温隔热、隔声和防火要求。北方常用外墙外保温系统，南方注重遮阳通风。',
      funFact: '中国现行的建筑节能标准要求住宅外墙传热系数不高于0.45W/(m²·K)。',
    },
    mitochondria: {
      note: '住宅围护结构的热工性能直接影响采暖和空调能耗，是建筑节能的关键环节。',
      funFact: '一栋住宅通过外墙散失的热量可占总散热量的25-35%。',
    },
    granules: {
      title: '家居设备',
      subtitle: '给排水与电气系统',
      note: '住宅设备系统相对简单，包括给排水、照明、弱电和暖通。智能家居正在改变传统住宅设备配置。',
      funFact: '现代住宅每户配电标准从过去的4kW提升到8-12kW。',
    },
  },
  commercial: {
    lysosome: {
      note: '商业建筑常采用大跨度结构体系，如钢桁架、空间网架或预应力混凝土，以创造无柱大空间。',
      funFact: '大型购物中心的中庭往往跨越5-7层，结构跨度可达30-50米。',
    },
    nucleus: {
      note: '商业建筑基础荷载大、不均匀沉降风险高，常采用桩基础或筏板+桩的复合基础。',
    },
  },
  office: {
    nucleus: {
      note: '高层办公楼常用桩基础，单桩承载力可达数千吨。核心筒下方往往布桩最密。',
      funFact: '上海中心大厦的桩基深入地下86米，相当于28层楼的高度。',
    },
    lysosome: {
      note: '框架-核心筒是高层办公建筑最常用的结构体系，核心筒承担水平力，外框架承担竖向荷载。',
      funFact: '核心筒的墙体厚度从底部800mm到顶部300mm逐级收分。',
    },
  },
  cultural: {
    membrane: {
      title: '标志性外皮',
      subtitle: '建筑形象与文化传播',
      location: '建筑外围与屋面',
      note: '文化建筑的围护结构往往是建筑表达的载体，如幕墙系统、清水混凝土、参数化表皮等。',
      funFact: '扎哈·哈迪德的广州大剧院外皮由64个不同的面片组成，每个面片都是唯一的。',
    },
  },
  industrial: {
    granules: {
      title: '工艺设备',
      subtitle: '生产线与物流设备',
      size: '取决于生产工艺',
      location: '厂房内部及附属空间',
      note: '工业建筑的设备系统以生产工艺设备为主，建筑设备（暖通、给排水、电气）为生产服务。',
      funFact: '大型汽车制造车间的设备用电负荷可达数万千瓦，相当于一个小城镇的用电量。',
    },
  },
  educational: {
    nucleus: {
      note: '教学楼基础通常采用独立基础或条形基础，当地质条件较差时采用桩基础。教室开间一般3.6-4.2m，进深6-9m。',
      funFact: '中国中小学教室标准面积为67-83㎡，每间教室容纳45-50名学生。',
    },
  },
  medical: {
    mitochondria: {
      note: '医院建筑的围护结构需满足严格的卫生和感染控制要求，包括洁净区密封、负压隔离病房等特殊需求。',
      funFact: '手术室围护结构需达到气密性4级以上，换气次数可达15-25次/小时。',
    },
  },
}

export const CELL_BODY = {
  residential: { color: '#b8d983', scale: [1.2, 0.9, 0.8], kind: 'box' },
  commercial: { color: '#c9d3e6', scale: [1.5, 1.4, 0.9], kind: 'box' },
  office: { color: '#d8c6ff', scale: [0.8, 1.8, 0.7], kind: 'box' },
  cultural: { color: '#efb4a6', scale: [1.3, 0.7, 1.1], kind: 'sphere' },
  industrial: { color: '#8ed9bc', scale: [1.6, 0.8, 1.0], kind: 'box' },
  educational: { color: '#b8dcf2', scale: [1.4, 0.7, 0.8], kind: 'box' },
  medical: { color: '#e78a94', scale: [1.3, 1.0, 0.9], kind: 'box' },
}
